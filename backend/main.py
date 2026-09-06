"""
FastAPI application — main entry point.
Lifespan:
  1. Create DB tables
  2. Seed the resort
  3. Train ML models if artifacts missing
  4. Register all 8 agents
  5. Start the SimClock
  6. Register tick handlers: generators → derived fields → broadcast
WebSocket /ws — streams state patches to connected clients.
"""
from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.models import Base, engine, SessionLocal

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
# Lifespan
# ------------------------------------------------------------------ #

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables
    import backend.models.resort
    import backend.models.people
    import backend.models.guests
    import backend.models.assets
    import backend.models.inventory
    import backend.models.revenue
    import backend.models.intelligence
    Base.metadata.create_all(bind=engine)
    logger.info("DB tables created/verified.")

    # 2. Seed
    db = SessionLocal()
    try:
        from backend.sim.seed import seed_all
        seed_all(db)
    finally:
        db.close()

    # 2b. Restore a realistic occupied-room baseline on startup.
    #     If ALL rooms are vacant (e.g. after a checkout-all), put 76 back to occupied
    #     so both dashboards start with a realistic occupancy reading.
    db = SessionLocal()
    try:
        from backend.models.resort import Room as _Room
        occupied_count = db.query(_Room).filter(_Room.status == "occupied").count()
        if occupied_count == 0:
            rooms_list = db.query(_Room).all()
            for idx, r in enumerate(rooms_list):
                r.status = "occupied" if idx < 76 else "vacant_clean"
            db.commit()
            logger.info("Startup: restored 76 rooms to occupied (was fully vacant).")
    except Exception:
        logger.warning("Startup: room baseline restore failed.", exc_info=True)
    finally:
        db.close()

    # 3. Train ML models if needed
    artifacts_dir = os.path.join(os.path.dirname(__file__), "ml", "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)
    metrics_path = os.path.join(artifacts_dir, "metrics.json")
    if not os.path.exists(metrics_path):
        logger.info("ML artifacts not found — training now (this takes ~60s)...")
        try:
            from backend.ml.train_all import train_all
            train_all()
            logger.info("ML training complete.")
        except Exception:
            logger.warning("ML training failed — agents will use heuristic fallbacks.", exc_info=True)
    else:
        logger.info("ML artifacts found — skipping training.")

    # 4. Register agents
    from backend.agents.staffing import StaffingAgent
    from backend.agents.maintenance import MaintenanceAgent
    from backend.agents.inventory import InventoryAgent
    from backend.agents.concierge import ConciergeAgent
    from backend.agents.pricing import PricingAgent
    from backend.agents.sentiment import SentimentAgent
    from backend.agents.personalization import PersonalizationAgent
    from backend.agents.segmentation import SegmentationAgent

    agents = [
        StaffingAgent(),
        MaintenanceAgent(),
        InventoryAgent(),
        ConciergeAgent(),
        PricingAgent(),
        SentimentAgent(),
        PersonalizationAgent(),
        SegmentationAgent(),
    ]
    app.state.agents = agents

    # 5. Set up generators
    from backend.core.bus import bus
    from backend.sim.generators import ResortGenerators
    generators = ResortGenerators(bus)
    app.state.generators = generators

    # Populate initial generator state from DB
    _refresh_generator_state(generators)

    # 6. Register tick handlers in order:
    #    generators → derived fields → broadcast
    from backend.core.clock import clock
    from backend.core.broadcast import manager

    async def tick_handler(sim_ts: datetime, tick_count: int) -> None:
        # a. Generate stochastic events
        await generators.tick(sim_ts, tick_count)

        # b. Recompute derived fields
        state_patch = await _recompute_derived(sim_ts)

        # c. Refresh generator state snapshot
        _refresh_generator_state(generators)

        # d. Broadcast patch to all WS clients
        from backend.core.ledger import ledger
        from backend.core.bus import bus as event_bus

        # Collect new decisions since last broadcast
        new_decisions = []
        if hasattr(app.state, "_last_decision_count"):
            all_d = ledger.all()
            new_decisions = [d.to_dict() for d in all_d[:5]]  # newest 5

        # Collect recent events
        recent_events = [e.to_dict() for e in event_bus.recent(n=20)]

        await manager.broadcast_patch(
            paths=state_patch,
            sim_ts=sim_ts,
            events=recent_events,
            decisions=new_decisions,
        )

    # Register periodic agent handlers
    for agent in agents:
        clock.register_periodic(agent.every_n_ticks, agent._periodic_tick)

    clock.register_tick_listener(tick_handler)

    # 7. Start clock
    await clock.start()
    app.state.clock = clock
    logger.info("🚀 Resorva is live. sim_now=%s", clock.sim_now)

    yield

    # Shutdown
    await clock.stop()
    logger.info("Clock stopped.")


# ------------------------------------------------------------------ #
# Derived field recomputation
# ------------------------------------------------------------------ #

async def _recompute_derived(sim_ts: datetime) -> Dict[str, Any]:
    """
    Recompute all derived fields and return a path-diff dict.
    This is the tick step 5 from the spec.
    """
    patch: Dict[str, Any] = {}
    db: Session = SessionLocal()
    try:
        from backend.models.resort import Zone, Room
        from backend.models.people import Staff, Task
        from backend.models.guests import Guest, Booking
        from backend.models.assets import Asset
        from backend.models.inventory import InventoryItem
        from backend.models.revenue import ServiceSlot, RateCalendar

        # --- Zones: staff_on_duty, backlog_count, workload_index, staff_required_now ---
        import math
        zones = db.query(Zone).all()
        for zone in zones:
            on_duty = db.query(Staff).filter(
                Staff.current_zone_id == zone.id,
                Staff.status.in_(["idle", "busy"]),
            ).count()
            if zone.staff_on_duty != on_duty:
                zone.staff_on_duty = on_duty
                patch[f"zones.{zone.id}.staff_on_duty"] = on_duty

            backlog = db.query(Task).filter(
                Task.zone_id == zone.id,
                Task.status.in_(["open", "assigned", "in_progress"]),
            ).count()
            if zone.backlog_count != backlog:
                zone.backlog_count = backlog
                patch[f"zones.{zone.id}.backlog_count"] = backlog

            # Dynamic workload index calculation
            occ_rooms = db.query(Room).filter(Room.zone_id == zone.id, Room.status == "occupied").count()
            total_rooms = db.query(Room).filter(Room.zone_id == zone.id).count()
            occ_factor = (occ_rooms / max(1, total_rooms)) if total_rooms > 0 else 0.70
            hour = sim_ts.hour if hasattr(sim_ts, 'hour') else 14
            time_factor = 1.1 if 8 <= hour <= 22 else 0.7
            base_wi = int(min(98, max(28, (occ_factor * 45 + backlog * 8 + 32) * time_factor)))
            if zone.workload_index != base_wi:
                zone.workload_index = base_wi
                patch[f"zones.{zone.id}.workload_index"] = base_wi

            req = max(zone.staff_required_baseline, math.ceil(base_wi / 100.0 * zone.staff_required_baseline * 1.3))
            if zone.staff_required_now != req:
                zone.staff_required_now = req
                patch[f"zones.{zone.id}.staff_required_now"] = req

        # --- Tasks: SLA remaining, is_breaching ---
        open_tasks = db.query(Task).filter(
            Task.status.in_(["open", "assigned", "in_progress"])
        ).all()
        for task in open_tasks:
            if task.created_at:
                elapsed = (datetime.utcnow() - task.created_at).total_seconds() / 60
                remaining = task.sla_minutes - elapsed
                breaching = remaining < 5
                if abs(task.sla_remaining - remaining) > 0.5 or task.is_breaching != breaching:
                    task.sla_remaining = max(0, remaining)
                    task.is_breaching = breaching
                    patch[f"tasks.{task.id}.sla_remaining"] = round(task.sla_remaining, 1)
                    patch[f"tasks.{task.id}.is_breaching"] = breaching

        # --- Staff: fatigue_score ---
        all_staff = db.query(Staff).all()
        for s in all_staff:
            # fatigue rises with hours worked and streak
            fatigue = min(100.0, s.hours_this_week * 1.5 + s.days_worked_streak * 5)
            if abs(s.fatigue_score - fatigue) > 0.5:
                s.fatigue_score = fatigue
                patch[f"staff.{s.id}.fatigue_score"] = round(fatigue, 1)

        # --- Inventory: days_of_cover ---
        items = db.query(InventoryItem).all()
        for item in items:
            if item.forecast_7d > 0:
                doc = (item.on_hand / (item.forecast_7d / 7)) if item.forecast_7d > 0 else 999
                if abs(item.days_of_cover - doc) > 0.1:
                    item.days_of_cover = round(doc, 2)
                    patch[f"inventory.{item.id}.days_of_cover"] = round(doc, 2)

        # --- ServiceSlots: fill_pct, minutes_to_expiry ---
        slots = db.query(ServiceSlot).filter(ServiceSlot.start_ts > datetime.utcnow()).all()
        for slot in slots:
            fill = (slot.booked / slot.capacity * 100) if slot.capacity else 0
            mte = (slot.start_ts - datetime.utcnow()).total_seconds() / 60
            if abs(slot.fill_pct - fill) > 0.1:
                slot.fill_pct = fill
                patch[f"slots.{slot.id}.fill_pct"] = round(fill, 1)
            if abs(slot.minutes_to_expiry - mte) > 1:
                slot.minutes_to_expiry = mte
                patch[f"slots.{slot.id}.minutes_to_expiry"] = round(mte, 1)

        # --- Clock state ---
        from backend.core.clock import clock
        from backend.api.sim import CURRENT_ACTIVE_CHAOS

        # --- Global KPIs ---
        total_rooms = db.query(Room).count() or 84
        occupied_rooms = db.query(Room).filter(Room.status == "occupied").count()
        # Use real DB occupancy — reflects checkouts & check-ins immediately
        occupancy_pct = round((occupied_rooms / total_rooms * 100), 1)

        # If chaos scenario active, apply its KPI overrides
        if CURRENT_ACTIVE_CHAOS:
            if "occupancy_pct" in CURRENT_ACTIVE_CHAOS:
                occupancy_pct = CURRENT_ACTIVE_CHAOS["occupancy_pct"]
                occupied_rooms = int(total_rooms * (occupancy_pct / 100.0))

        patch["kpis.occupancy_pct"] = occupancy_pct
        patch["kpis.occupied_rooms"] = occupied_rooms

        staff_on_duty = db.query(Staff).filter(Staff.status.in_(["idle","busy"])).count()
        patch["kpis.staff_on_duty"] = staff_on_duty

        open_task_count = db.query(Task).filter(Task.status.in_(["open","assigned","in_progress"])).count()
        patch["kpis.open_tasks"] = open_task_count

        sla_breaches = db.query(Task).filter(Task.is_breaching == True).count()
        patch["kpis.sla_breaches"] = sla_breaches

        from backend.core.ledger import ledger as _ledger
        stats = _ledger.stats()
        patch["kpis.decisions_today"] = stats["total"]
        patch["kpis.rupees_protected"] = round(stats["total_rupee_impact"], 2)

        from backend.models.guests import Guest
        guests_at_risk = db.query(Guest).filter(Guest.gers_score >= 70).count()
        patch["kpis.guests_at_risk"] = guests_at_risk

        # --- Derived Stress Index & Rolling 7-day Trend ---
        # Weighted: 0.35 * avg_zone_workload + 0.25 * staff_utilisation + 0.20 * maintenance_risk + 0.20 * sla_breach_ratio
        zone_wis = [z.workload_index for z in zones if z.workload_index is not None]
        avg_wi = sum(zone_wis) / max(1, len(zone_wis)) if zone_wis else 50.0

        all_staff_objs = db.query(Staff).all()
        staff_utils = [s.utilisation_pct for s in all_staff_objs if s.utilisation_pct is not None]
        avg_util = sum(staff_utils) / max(1, len(staff_utils)) if staff_utils else 72.0

        assets_all = db.query(Asset).all()
        maint_risks = [max(0.0, 100.0 - a.health_score) for a in assets_all if a.health_score is not None]
        avg_maint_risk = sum(maint_risks) / max(1, len(maint_risks)) if maint_risks else 25.0

        sla_ratio = (sla_breaches / max(1, open_task_count)) * 100.0

        stress_calc = round(0.35 * avg_wi + 0.25 * avg_util + 0.20 * avg_maint_risk + 0.20 * sla_ratio)
        stress_index = max(58, min(95, stress_calc))

        # Chaos override for stress index
        if CURRENT_ACTIVE_CHAOS and "stress_index" in CURRENT_ACTIVE_CHAOS:
            stress_index = CURRENT_ACTIVE_CHAOS["stress_index"]

        patch["stress_index"] = stress_index

        global _STRESS_TREND_SERIES
        if "_STRESS_TREND_SERIES" not in globals():
            _STRESS_TREND_SERIES = [58, 62, 54, 68, 60, 64, stress_index]
        else:
            _STRESS_TREND_SERIES[-1] = stress_index
            if len(_STRESS_TREND_SERIES) > 7:
                _STRESS_TREND_SERIES = _STRESS_TREND_SERIES[-7:]
        patch["stress_trend"] = list(_STRESS_TREND_SERIES)

        # Weather state from simulation or chaos
        if CURRENT_ACTIVE_CHAOS and "weather" in CURRENT_ACTIVE_CHAOS:
            patch["weather"] = CURRENT_ACTIVE_CHAOS["weather"]
        else:
            hour_now = sim_ts.hour if hasattr(sim_ts, "hour") else 14
            weather_cond = "Rainy" if 14 <= hour_now <= 16 else ("Partly Cloudy" if hour_now >= 18 else "Sunny")
            weather_temp = 28 if weather_cond == "Partly Cloudy" else (24 if weather_cond == "Rainy" else 31)
            patch["weather"] = {"temp": weather_temp, "condition": weather_cond}

        db.commit()
    except Exception:
        logger.exception("Derived field recompute error")
        db.rollback()
    finally:
        db.close()

    return patch


def _refresh_generator_state(generators) -> None:
    """Push current DB state into the generators for accurate stochastic rates."""
    db = SessionLocal()
    try:
        from backend.models.resort import Room
        from backend.models.guests import Booking
        from backend.models.assets import Asset
        from backend.models.inventory import InventoryItem

        total = db.query(Room).count() or 84
        occ = db.query(Room).filter_by(status="occupied").count()
        generators.state["occupancy_pct"] = occ / total

        in_house = db.query(Booking).filter_by(status="checked_in").all()
        generators.state["in_house_guests"] = [
            {"guest_id": b.guest_id, "room_id": b.room_id, "booking_id": b.id}
            for b in in_house
        ]

        assets = db.query(Asset).all()
        generators.state["assets"] = [
            {
                "asset_id": a.id,
                "kind": a.kind,
                "health_score": a.health_score,
                "room_id": a.room_id,
                "degrading": a.health_score < 50,
            }
            for a in assets
        ]

        items = db.query(InventoryItem).all()
        generators.state["inventory_items"] = [
            {"item_id": i.id, "category": i.category, "on_hand": i.on_hand, "par_level": i.par_level}
            for i in items
        ]
    except Exception:
        logger.exception("Generator state refresh error")
    finally:
        db.close()


# ------------------------------------------------------------------ #
# App
# ------------------------------------------------------------------ #

app = FastAPI(
    title="Resorva & ResortierAi",
    description="AI-powered resort operations platform — Hackcelestial 3.0",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
# Routers
# ------------------------------------------------------------------ #

from backend.api import router as api_router
app.include_router(api_router, prefix="/api")


# ------------------------------------------------------------------ #
# WebSocket endpoint
# ------------------------------------------------------------------ #

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    from backend.core.broadcast import manager
    from backend.core.clock import clock
    await manager.connect(ws)
    try:
        # Send full snapshot on first connect
        snapshot = await _build_snapshot()
        await ws.send_text(json.dumps({
            "type": "snapshot",
            "ts": datetime.utcnow().isoformat(),
            "sim_ts": clock.sim_now.isoformat(),
            "state": snapshot,
        }, default=str))

        # Keep connection alive; patches arrive via broadcast_patch
        while True:
            await ws.receive_text()  # client heartbeat / commands
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(ws)


async def _build_snapshot() -> dict:
    """Full state snapshot for new WebSocket clients."""
    db = SessionLocal()
    try:
        from backend.models.resort import Zone, Room, RoomType
        from backend.models.people import Staff, Task
        from backend.models.guests import Guest, Booking
        from backend.models.assets import Asset
        from backend.models.inventory import InventoryItem, PurchaseOrder
        from backend.models.revenue import ServiceSlot, RateCalendar
        from backend.models.intelligence import Feedback, Segment, Alert
        from backend.core.ledger import ledger
        from backend.core.bus import bus
        from backend.core.clock import clock

        return {
            "zones":     [z.to_dict() for z in db.query(Zone).all()],
            "room_types":[rt.to_dict() for rt in db.query(RoomType).all()],
            "rooms":     [r.to_dict() for r in db.query(Room).all()],
            "staff":     [s.to_dict() for s in db.query(Staff).all()],
            "tasks":     [t.to_dict() for t in db.query(Task).filter(
                            Task.status.in_(["open","assigned","in_progress"])
                          ).order_by(Task.created_at.desc()).limit(100).all()],
            "guests":    [g.to_dict() for g in db.query(Guest).limit(300).all()],
            "bookings":  [b.to_dict() for b in db.query(Booking).filter(
                            Booking.status.in_(["confirmed","checked_in"])
                          ).all()],
            "assets":    [a.to_dict() for a in db.query(Asset).all()],
            "inventory": [i.to_dict() for i in db.query(InventoryItem).all()],
            "purchase_orders": [po.to_dict() for po in db.query(PurchaseOrder).filter_by(status="draft").all()],
            "slots":     [s.to_dict() for s in db.query(ServiceSlot).filter(
                            ServiceSlot.start_ts > datetime.utcnow()
                          ).order_by(ServiceSlot.start_ts).limit(60).all()],
            "segments":  [s.to_dict() for s in db.query(Segment).all()],
            "recent_feedback": [f.to_dict() for f in db.query(Feedback).order_by(
                            Feedback.ts.desc()).limit(20).all()],
            "alerts":    [a.to_dict() for a in db.query(Alert).filter_by(acknowledged=False).limit(20).all()],
            "decisions": [d.to_dict() for d in ledger.all()[:50]],
            "events":    [e.to_dict() for e in bus.recent(n=30)],
            "agents":    [ag.status_dict() for ag in app.state.agents],
            "clock":     clock.state(),
            "ledger_stats": ledger.stats(),
            "kpis": {
                "occupancy_pct": 85.7,
                "occupied_rooms": 72,
                "staff_on_duty": db.query(Staff).filter(Staff.status.in_(["idle","busy"])).count(),
                "open_tasks": db.query(Task).filter(Task.status.in_(["open","assigned","in_progress"])).count(),
                "sla_breaches": db.query(Task).filter(Task.is_breaching == True).count(),
                "decisions_today": ledger.stats()["total"],
                "rupees_protected": round(ledger.stats()["total_rupee_impact"], 2),
                "guests_at_risk": db.query(Guest).filter(Guest.gers_score >= 70).count(),
                "food_waste_pct": 4.2,
                "reviews_prevented": 0,
            },
            "stress_index": 68,
            "stress_trend": [58, 62, 54, 68, 60, 64, 68],
            "weather": {"temp": 28, "condition": "Partly Cloudy"},
        }
    finally:
        db.close()


# ------------------------------------------------------------------ #
# Root & Health check
# ------------------------------------------------------------------ #

@app.get("/")
async def root():
    from backend.core.clock import clock
    return {
        "name": "Resorva & ResortierAi Operations Platform API",
        "status": "online",
        "sim_now": clock.sim_now.isoformat(),
        "health": "/health",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    from backend.core.clock import clock
    return {"status": "ok", "sim_now": clock.sim_now.isoformat()}

