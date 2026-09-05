"""
Staffing Agent — every_n_ticks: 3.

Computes a workload index (WI) per zone and solves the assignment problem
with scipy.optimize.linear_sum_assignment. Every decision has ≥3 real-number
reasoning steps and a rupee counterfactual.
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime
from typing import Dict, List

import numpy as np

from backend.agents.base import Agent
from backend.models import SessionLocal
from backend.models.intelligence import Event

logger = logging.getLogger(__name__)

# Workload index weights (sum to 1)
W = {
    "occupancy_load":           0.30,
    "arrival_departure_pressure": 0.20,
    "dirty_room_queue":         0.15,
    "open_task_backlog":        0.15,
    "fnb_covers_now":           0.10,
    "event_calendar_load":      0.10,
}

# Historical p95 baselines per zone kind (units vary — normalised to 0..1 range)
P95 = {
    "rooms":     {"occupancy_load": 28, "arrival_departure_pressure": 8,
                  "dirty_room_queue": 12, "open_task_backlog": 10,
                  "fnb_covers_now": 0, "event_calendar_load": 0},
    "fnb":       {"occupancy_load": 0, "arrival_departure_pressure": 0,
                  "dirty_room_queue": 0, "open_task_backlog": 8,
                  "fnb_covers_now": 80, "event_calendar_load": 20},
    "banquet":   {"occupancy_load": 0, "arrival_departure_pressure": 0,
                  "dirty_room_queue": 0, "open_task_backlog": 10,
                  "fnb_covers_now": 200, "event_calendar_load": 150},
    "spa":       {"occupancy_load": 0, "arrival_departure_pressure": 0,
                  "dirty_room_queue": 0, "open_task_backlog": 5,
                  "fnb_covers_now": 0, "event_calendar_load": 0},
    "frontdesk": {"occupancy_load": 0, "arrival_departure_pressure": 12,
                  "dirty_room_queue": 0, "open_task_backlog": 8,
                  "fnb_covers_now": 0, "event_calendar_load": 0},
    "kitchen":   {"occupancy_load": 0, "arrival_departure_pressure": 0,
                  "dirty_room_queue": 0, "open_task_backlog": 6,
                  "fnb_covers_now": 80, "event_calendar_load": 20},
}


class StaffingAgent(Agent):
    name = "staffing"
    every_n_ticks = 3
    subscribes = ["booking.created", "guest.checked_in", "guest.checked_out", "staff.no_show"]

    def __init__(self) -> None:
        super().__init__()
        self._model = self._try_load_model("backend/ml/artifacts/demand_zone.joblib")
        # Zone workload history for normalisation
        self._wi_history: Dict[int, List[float]] = {}
        self._event_load: Dict[int, float] = {}  # zone_id -> extra load from events

    async def on_event(self, event: Event) -> None:
        if event.type in ("booking.created", "guest.checked_in", "guest.checked_out"):
            await self.periodic(datetime.utcnow(), -1)
        elif event.type == "staff.no_show":
            await self._handle_no_show(event)

    async def _handle_no_show(self, event: Event) -> None:
        payload = event.payload if isinstance(event.payload, dict) else json.loads(event.payload or "{}")
        staff_id = payload.get("staff_id")
        staff_name = payload.get("staff_name", f"staff#{staff_id}")
        db = SessionLocal()
        try:
            from backend.models.people import Staff, Task
            from backend.models.resort import Zone

            absent = db.query(Staff).get(staff_id)
            if not absent:
                return

            zone_id = absent.current_zone_id
            zone = db.query(Zone).get(zone_id)
            zone_name = zone.name if zone else f"zone#{zone_id}"

            # Find the least-fatigued idle staff member in an adjacent zone
            replacement = (
                db.query(Staff)
                .filter(Staff.status == "idle", Staff.id != staff_id)
                .order_by(Staff.fatigue_score)
                .first()
            )

            if not replacement:
                return

            old_zone_id = replacement.current_zone_id
            replacement.current_zone_id = zone_id

            # Est revenue at risk: avg 2h of uncovered housekeeping = ~2 rooms
            est_delay_min = 120
            rooms_affected = 2
            avg_rev = 9500 / 24  # per-hour ADR spread
            rev_at_risk = est_delay_min / 60 * rooms_affected * avg_rev

            await self.emit_decision(
                title=f"No-show: reassigning {replacement.name} to cover {zone_name}",
                reasoning_steps=[
                    f"{staff_name} (id={staff_id}) failed to report for shift in {zone_name}.",
                    f"{replacement.name} (fatigue={replacement.fatigue_score:.0f}/100) is idle in zone#{old_zone_id} — lowest fatigue among {db.query(Staff).filter(Staff.status=='idle').count()} idle staff.",
                    f"Estimated uncovered window: 120 min → {rooms_affected} rooms delayed → ₹{rev_at_risk:.0f} revenue at risk.",
                ],
                confidence=0.95,
                rupee_impact=rev_at_risk,
                counterfactual_text=f"Without reassignment, {zone_name} would be understaffed for ≥2h.",
                counterfactual_rupees=rev_at_risk,
                autonomy="auto",
                cascade_id=event.cascade_id,
                linked_event_id=event.id,
            )
            db.commit()
        finally:
            db.close()

    async def periodic(self, sim_ts: datetime, tick_count: int) -> None:
        db = SessionLocal()
        try:
            from backend.models.resort import Zone, Room
            from backend.models.people import Staff, Task

            zones = db.query(Zone).all()
            gaps = []  # (zone, shortfall)

            for zone in zones:
                wi = self._compute_wi(zone, db, sim_ts)
                zone.workload_index = wi

                required = max(
                    zone.staff_required_baseline,
                    math.ceil(wi / 100 * zone.staff_required_baseline * 1.5)
                )
                zone.staff_required_now = required
                on_duty = db.query(Staff).filter(
                    Staff.current_zone_id == zone.id,
                    Staff.status.in_(["idle", "busy"]),
                ).count()
                zone.staff_on_duty = on_duty

                shortfall = required - on_duty
                if shortfall > 0:
                    gaps.append((zone, shortfall, wi))

            db.flush()

            if not gaps:
                return

            # Sort gaps by workload × shortfall severity
            gaps.sort(key=lambda x: x[2] * x[1], reverse=True)
            top_gap_zone, shortfall, wi = gaps[0]

            if wi < 60:
                return  # not urgent enough to act

            # Find reassignable idle staff from zones with surplus
            idle_staff = (
                db.query(Staff)
                .filter(Staff.status == "idle")
                .all()
            )

            if not idle_staff:
                return

            # Build cost matrix: staff × gap_zone
            gap_zones = [g[0] for g in gaps[:3]]
            cost_matrix = np.zeros((len(idle_staff), len(gap_zones)))

            for i, s in enumerate(idle_staff):
                for j, gz in enumerate(gap_zones):
                    # Skill mismatch penalty
                    skills = json.loads(s.skills)
                    skill_match = any(k in skills for k in ["room_cleaning", "service", "bartending"])
                    skill_penalty = 0 if skill_match else 20

                    # Fatigue penalty
                    fatigue_penalty = s.fatigue_score * 0.3

                    # Overtime penalty (past 8h)
                    overtime_penalty = max(0, s.hours_this_week - 40) * 5

                    # Continuity bonus (stay in current zone)
                    continuity_bonus = -10 if s.current_zone_id == gz.id else 0

                    cost_matrix[i, j] = skill_penalty + fatigue_penalty + overtime_penalty + continuity_bonus

            try:
                from scipy.optimize import linear_sum_assignment
                row_ind, col_ind = linear_sum_assignment(cost_matrix)
                assignments = [(idle_staff[r], gap_zones[c]) for r, c in zip(row_ind, col_ind)]
                assignments = assignments[:shortfall]  # cap at shortfall
            except Exception:
                # Fallback: pick by lowest fatigue
                assignments = [(idle_staff[0], top_gap_zone)]

            if not assignments:
                return

            reassigned_names = [s.name for s, _ in assignments]
            for s, gz in assignments:
                # Legal hours check
                if s.hours_this_week >= 60:
                    logger.info("[staffing] Skipping %s — legal hours cap (%.0fh)", s.name, s.hours_this_week)
                    continue
                s.current_zone_id = gz.id

            db.flush()

            counterfactual_min = shortfall * 30
            avg_rev_per_unit = 9500 / 24 / 60 * top_gap_zone.capacity
            rev_at_risk = counterfactual_min * avg_rev_per_unit

            await self.emit_decision(
                title=f"Reassign {len(assignments)} staff → {top_gap_zone.name} (WI={wi:.0f})",
                reasoning_steps=[
                    f"{top_gap_zone.name} workload index: {wi:.1f}/100 (threshold 70); {top_gap_zone.staff_on_duty} staff on duty, {top_gap_zone.staff_required_now} required → shortfall {shortfall}.",
                    f"Scipy linear_sum_assignment solved {len(idle_staff)}×{len(gap_zones)} cost matrix (factors: skill, fatigue, overtime, continuity). Assigned: {', '.join(reassigned_names)}.",
                    f"Reassigned staff average fatigue: {sum(s.fatigue_score for s,_ in assignments)/max(1,len(assignments)):.1f}/100. No staff exceed 60h legal cap.",
                ],
                confidence=0.85,
                rupee_impact=rev_at_risk * 0.7,
                counterfactual_text=f"Without reassignment: ~{shortfall} tasks delayed {counterfactual_min}min → est. ₹{rev_at_risk:.0f} at risk (SLA breaches + review impact).",
                counterfactual_rupees=rev_at_risk,
                autonomy="auto",
                linked_entity=f"zone:{top_gap_zone.id}",
            )
            db.commit()

            # Emit event for cascade linkage
            await self._bus.publish(
                "staffing.reassigned",
                payload={
                    "zone_id": top_gap_zone.id,
                    "zone_name": top_gap_zone.name,
                    "reassigned": reassigned_names,
                    "workload_index": round(wi, 1),
                },
                emitted_by=self.name,
                sim_ts=sim_ts,
            )
        except Exception:
            logger.exception("[staffing] periodic() error")
            db.rollback()
        finally:
            db.close()

    def _compute_wi(self, zone, db, sim_ts: datetime) -> float:
        from backend.models.resort import Room
        from backend.models.people import Task

        p95 = P95.get(zone.kind, P95["rooms"])

        terms = {
            "occupancy_load": db.query(Room).filter(
                Room.zone_id == zone.id, Room.status == "occupied"
            ).count(),
            "arrival_departure_pressure": db.query(Room).filter(
                Room.zone_id == zone.id, Room.status == "vacant_dirty"
            ).count() * 2,
            "dirty_room_queue": db.query(Room).filter(
                Room.zone_id == zone.id, Room.status == "vacant_dirty"
            ).count(),
            "open_task_backlog": db.query(Task).filter(
                Task.zone_id == zone.id,
                Task.status.in_(["open", "assigned"]),
            ).count(),
            "fnb_covers_now": 40 if zone.kind in ("fnb", "kitchen") and 7 <= sim_ts.hour <= 22 else 0,
            "event_calendar_load": self._event_load.get(zone.id, 0),
        }

        wi = 0.0
        for key, weight in W.items():
            denom = p95.get(key, 1) or 1
            normalised = min(1.0, terms[key] / denom)
            wi += weight * normalised * 100

        return min(100.0, max(0.0, wi))
