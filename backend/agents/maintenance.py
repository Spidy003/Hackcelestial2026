"""
Maintenance Agent — every_n_ticks: 5.

Health score fuses three signals:
  40% telemetry anomaly (IsolationForest)
  35% inspection severity (TF-IDF + LR classifier)
  25% complaint density (decayed guest complaints)

Days-to-failure from GradientBoostingRegressor.
Revenue-impact window scheduling: picks the 3h window with lowest impact
that lands before predicted_failure × 0.6.
"""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np

from backend.agents.base import Agent
from backend.models import SessionLocal
from backend.models.intelligence import Event

logger = logging.getLogger(__name__)

# Anomaly signal weight
TELEMETRY_W = 0.40
INSPECTION_W = 0.35
COMPLAINT_W = 0.25

SEVERITY_MAP = {"none": 0.0, "minor": 0.25, "major": 0.65, "critical": 1.0}


class MaintenanceAgent(Agent):
    name = "maintenance"
    every_n_ticks = 5
    subscribes = ["asset.reading", "inspection.filed", "feedback.submitted"]

    def __init__(self) -> None:
        super().__init__()
        self._anomaly_model = self._try_load_model("backend/ml/artifacts/asset_anomaly.joblib")
        self._rul_model = self._try_load_model("backend/ml/artifacts/asset_rul.joblib")
        self._severity_model = self._try_load_model("backend/ml/artifacts/inspection_severity.joblib")
        # Rolling telemetry buffer: asset_id -> list of (metric, value)
        self._telem_buffer: Dict[int, List[tuple]] = defaultdict(list)
        # Complaint counts: asset_id -> decayed count
        self._complaint_density: Dict[int, float] = defaultdict(float)
        # Latest inspection severity per asset
        self._inspection_severity: Dict[int, float] = defaultdict(float)

    async def on_event(self, event: Event) -> None:
        payload = event.payload if isinstance(event.payload, dict) else json.loads(event.payload or "{}")

        if event.type == "asset.reading":
            asset_id = payload.get("asset_id")
            metric = payload.get("metric")
            value = payload.get("value")
            if asset_id:
                self._telem_buffer[asset_id].append((metric, value))
                # Keep last 50 readings per asset
                if len(self._telem_buffer[asset_id]) > 50:
                    self._telem_buffer[asset_id] = self._telem_buffer[asset_id][-50:]

        elif event.type == "inspection.filed":
            asset_id = payload.get("asset_id")
            note_text = payload.get("note_text", "")
            severity_hint = payload.get("severity_hint", "none")

            if asset_id:
                severity_score = self._classify_severity(note_text, severity_hint)
                self._inspection_severity[asset_id] = severity_score

                db = SessionLocal()
                try:
                    from backend.models.assets import Inspection
                    insp = Inspection(
                        asset_id=asset_id,
                        room_id=payload.get("room_id"),
                        staff_id=payload.get("staff_id"),
                        note_text=note_text,
                        severity_label=self._score_to_label(severity_score),
                    )
                    db.add(insp)
                    db.commit()
                finally:
                    db.close()

        elif event.type == "feedback.submitted":
            # Extract asset/zone complaints
            text = payload.get("text", "").lower()
            complaint_keywords = {
                "ac": ["ac", "air conditioning", "cooling", "cold"],
                "geyser": ["hot water", "geyser", "shower", "warm water"],
                "elevator": ["elevator", "lift"],
                "pool_filter": ["pool", "swimming"],
                "pump": ["water pressure", "pressure"],
            }
            db = SessionLocal()
            try:
                from backend.models.assets import Asset
                for kind, keywords in complaint_keywords.items():
                    if any(kw in text for kw in keywords):
                        assets = db.query(Asset).filter(Asset.kind == kind).all()
                        for a in assets:
                            self._complaint_density[a.id] = min(
                                1.0, self._complaint_density[a.id] + 0.15
                            )
            finally:
                db.close()

    async def periodic(self, sim_ts: datetime, tick_count: int) -> None:
        db = SessionLocal()
        try:
            from backend.models.assets import Asset, Telemetry
            from backend.models.revenue import ServiceSlot, RateCalendar
            from backend.models.resort import Room

            # Decay complaint density each run
            for aid in self._complaint_density:
                self._complaint_density[aid] *= 0.95

            assets = db.query(Asset).all()
            for asset in assets:
                # 1. Compute health score
                telem_anomaly = self._compute_anomaly(asset.id)
                insp_sev = self._inspection_severity.get(asset.id, 0.0)
                complaint = self._complaint_density.get(asset.id, 0.0)

                new_health = max(0.0, 100.0 - (
                    100 * (TELEMETRY_W * telem_anomaly + INSPECTION_W * insp_sev + COMPLAINT_W * complaint)
                ))

                # 2. Days to failure
                dtf = self._predict_dtf(asset, new_health)

                # 3. Revenue exposure (rooms blocked if asset fails)
                rev_exposure = self._revenue_exposure(asset, db)

                old_health = asset.health_score
                asset.health_score = round(new_health, 1)
                asset.predicted_days_to_failure = round(dtf, 1)
                asset.revenue_exposure = round(rev_exposure, 2)

                # Update runtime (accumulate per tick)
                asset.runtime_hours += (5 / 60)  # 5 sim-minutes per tick

                # 4. Raise alert if critical
                if new_health < 40 and old_health >= 40:
                    await self._bus.publish(
                        "maintenance.risk_raised",
                        payload={
                            "asset_id": asset.id,
                            "asset_name": asset.name,
                            "health_score": round(new_health, 1),
                            "dtf": round(dtf, 1),
                            "revenue_exposure": round(rev_exposure, 2),
                        },
                        emitted_by=self.name,
                        sim_ts=sim_ts,
                    )
                    await self._schedule_service(asset, dtf, rev_exposure, db, sim_ts)

                # 5. Regular scheduling check (every 30 ticks)
                elif tick_count % 30 == 0 and new_health < 70 and dtf < 30:
                    await self._schedule_service(asset, dtf, rev_exposure, db, sim_ts)

            db.commit()
        except Exception:
            logger.exception("[maintenance] periodic() error")
            db.rollback()
        finally:
            db.close()

    async def _schedule_service(
        self, asset, dtf: float, rev_exposure: float, db, sim_ts: datetime
    ) -> None:
        """Find the lowest-revenue-impact 3h service window and emit a work order."""
        from backend.models.revenue import ServiceSlot, RateCalendar

        deadline = sim_ts + timedelta(days=dtf * 0.6)
        best_window = None
        best_impact = float("inf")
        candidate_windows = []

        # Check every 3h window in the next 7 sim-days
        t = sim_ts + timedelta(hours=2)
        while t < min(deadline, sim_ts + timedelta(days=7)):
            window_end = t + timedelta(hours=3)
            # Estimate impact: rooms blocked × rate + service slots affected
            rooms_blocked = 1 if asset.room_id else 0
            rate_row = db.query(RateCalendar).filter(
                RateCalendar.date >= t,
                RateCalendar.room_type_id == 1,
            ).first()
            room_rate = rate_row.current_rate if rate_row else 8500.0

            slot_impact = db.query(ServiceSlot).filter(
                ServiceSlot.start_ts >= t,
                ServiceSlot.start_ts < window_end,
                ServiceSlot.booked > 0,
            ).count() * 2500  # avg slot margin

            impact = rooms_blocked * room_rate + slot_impact

            candidate_windows.append({
                "start": t.isoformat(),
                "impact": round(impact, 2),
                "day_of_week": t.strftime("%A"),
            })

            if impact < best_impact:
                best_impact = impact
                best_window = t

            t += timedelta(hours=3)

        if not best_window:
            return

        worst_window = max(candidate_windows, key=lambda x: x["impact"])

        # Update the asset's recommended service window
        asset.recommended_service_window = json.dumps({
            "start": best_window.isoformat(),
            "impact_rupees": round(best_impact, 2),
            "candidates_evaluated": len(candidate_windows),
            "worst_window_impact": worst_window["impact"],
        })

        # Create maintenance task
        from backend.models.people import Task, Staff
        tech = db.query(Staff).filter(
            Staff.role == "maintenance",
            Staff.status == "idle",
        ).order_by(Staff.fatigue_score).first()

        task = Task(
            type="maintenance",
            title=f"Service {asset.name} — health={asset.health_score:.0f}%",
            priority=1 if asset.health_score < 30 else 2,
            source="agent",
            zone_id=asset.zone_id,
            asset_id=asset.id,
            assigned_staff_id=tech.id if tech else None,
            sla_minutes=int(dtf * 0.6 * 1440),  # convert days to minutes, with safety margin
            est_minutes=180,
            status="assigned" if tech else "open",
        )
        db.add(task)
        db.flush()

        savings = worst_window["impact"] - best_impact

        await self.emit_decision(
            title=f"Schedule service: {asset.name} on {best_window.strftime('%a %d %b %H:%M')}",
            reasoning_steps=[
                f"Health score: {asset.health_score:.1f}/100 (threshold 70). Predicted failure in {dtf:.1f} days. Revenue exposure: ₹{rev_exposure:,.0f}.",
                f"Evaluated {len(candidate_windows)} candidate 3h windows over 7 days. Best: {best_window.strftime('%a %H:%M')} (impact ₹{best_impact:,.0f}). Worst rejected: {worst_window['day_of_week']} (impact ₹{worst_window['impact']:,.0f}).",
                f"Service window set to {best_window.strftime('%A %d %b, %H:%M')} — {(deadline - best_window).days} days before predicted failure deadline. Assigned to {tech.name if tech else 'unassigned (no idle tech)'}.",
            ],
            confidence=0.82,
            rupee_impact=savings,
            counterfactual_text=f"If asset fails unserviced: ₹{rev_exposure:,.0f} revenue exposure + emergency repair ₹{asset.replacement_cost * 0.3:,.0f}.",
            counterfactual_rupees=rev_exposure + asset.replacement_cost * 0.3,
            autonomy="auto",
            linked_entity=f"asset:{asset.id}",
        )

        await self._bus.publish(
            "maintenance.scheduled",
            payload={
                "asset_id": asset.id,
                "asset_name": asset.name,
                "window": best_window.isoformat(),
                "impact_rupees": round(best_impact, 2),
                "savings_vs_worst": round(savings, 2),
            },
            emitted_by=self.name,
            sim_ts=sim_ts,
        )

    def _compute_anomaly(self, asset_id: int) -> float:
        """IsolationForest anomaly score → 0..1. Falls back to Z-score."""
        readings = self._telem_buffer.get(asset_id, [])
        if len(readings) < 5:
            return 0.0

        values = np.array([r[1] for r in readings[-20:]]).reshape(-1, 1)

        if self._anomaly_model:
            try:
                # IsolationForest returns -1 (anomaly) / 1 (normal)
                model_map = self._anomaly_model
                if isinstance(model_map, dict):
                    # Separate model per asset_id or use generic
                    model = model_map.get(asset_id) or model_map.get("generic")
                else:
                    model = model_map
                if model:
                    scores = model.decision_function(values)
                    # Map to 0..1: lower score = more anomalous
                    normalised = max(0.0, min(1.0, (-scores[-1] + 0.2) / 0.6))
                    return normalised
            except Exception:
                pass

        # Fallback: Z-score
        if len(values) < 3:
            return 0.0
        mean, std = float(np.mean(values)), float(np.std(values))
        if std < 1e-6:
            return 0.0
        z = abs(float(values[-1][0]) - mean) / std
        return min(1.0, z / 3.0)

    def _predict_dtf(self, asset, health: float) -> float:
        """Days to failure from GBR or linear extrapolation fallback."""
        if self._rul_model:
            try:
                import pandas as pd
                row = pd.DataFrame([{
                    "health_score": health,
                    "runtime_hours": asset.runtime_hours,
                    "days_since_service": (
                        (datetime.utcnow() - asset.last_service_date).days
                        if asset.last_service_date else 365
                    ),
                    "age_days": (
                        (datetime.utcnow() - asset.install_date).days
                        if asset.install_date else 1000
                    ),
                    "anomaly_slope": 0.0,  # simplified
                    "criticality": asset.criticality,
                }])
                return max(0.5, float(self._rul_model.predict(row)[0]))
            except Exception:
                pass

        # Fallback: linear extrapolation from health slope
        if health <= 0:
            return 0.5
        # Assume 1% health loss per 2 days at current rate
        daily_degradation = max(0.1, (100 - health) / max(1, asset.runtime_hours / 24))
        return max(0.5, health / max(0.01, daily_degradation))

    def _revenue_exposure(self, asset, db) -> float:
        """₹ at risk if this asset fails today."""
        if asset.room_id:
            from backend.models.revenue import RateCalendar
            rate = db.query(RateCalendar).filter(
                RateCalendar.room_type_id == 1
            ).first()
            room_rate = rate.current_rate if rate else 9500.0
            # 3-day OOO impact
            return room_rate * 3 * asset.criticality
        else:
            # Zone-level asset: affects multiple rooms
            from backend.models.resort import Room
            rooms_in_zone = db.query(Room).filter(
                Room.zone_id == asset.zone_id
            ).count()
            return rooms_in_zone * 3500 * asset.criticality

    def _classify_severity(self, text: str, hint: str) -> float:
        if self._severity_model:
            try:
                pred = self._severity_model.predict([text])[0]
                return SEVERITY_MAP.get(pred, 0.0)
            except Exception:
                pass
        # Fallback keyword rules
        text_lower = text.lower()
        if any(w in text_lower for w in ["critical", "danger", "spark", "flood", "fire", "immediate"]):
            return SEVERITY_MAP["critical"]
        if any(w in text_lower for w in ["not working", "faulty", "broken", "mold", "leak"]):
            return SEVERITY_MAP["major"]
        if any(w in text_lower for w in ["noise", "deposit", "stain", "slow"]):
            return SEVERITY_MAP["minor"]
        return SEVERITY_MAP.get(hint, 0.0)

    def _score_to_label(self, score: float) -> str:
        if score >= 0.8: return "critical"
        if score >= 0.5: return "major"
        if score >= 0.15: return "minor"
        return "none"
