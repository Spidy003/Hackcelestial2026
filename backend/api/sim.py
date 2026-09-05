"""
Simulation scenario injector + what-if + reset_demo.
"""
from __future__ import annotations

import json
import uuid
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.models import SessionLocal
from backend.core.bus import bus
from backend.core.clock import clock

router = APIRouter()


class InjectBody(BaseModel):
    scenario: str

class WhatIfBody(BaseModel):
    date: str
    occupancy: float = 0.80
    weather: str = "sunny"
    has_event: bool = False


SCENARIOS = {
    "wedding_booking",
    "ac_failure_block_c",
    "rain_tomorrow",
    "staff_no_show",
    "bad_review_risk",
    "festival_weekend",
}

@router.post("/inject")
async def inject_scenario(body: InjectBody):
    if body.scenario not in SCENARIOS:
        raise HTTPException(400, f"Unknown scenario. Valid: {SCENARIOS}")

    cascade_id = str(uuid.uuid4())

    if body.scenario == "wedding_booking":
        db = SessionLocal()
        try:
            from backend.models.guests import Guest
            guest = db.query(Guest).first()
            guest_id = guest.id if guest else 1
        finally:
            db.close()

        target_date = clock.sim_now + timedelta(days=3)
        # Ensure date is a Saturday
        while target_date.weekday() != 5:
            target_date += timedelta(days=1)

        await bus.publish(
            "booking.created",
            payload={
                "guest_id": guest_id,
                "room_id": None,
                "channel": "direct",
                "nights": 2,
                "adults": 80,
                "children": 40,
                "party_size": 120,
                "occasion": "wedding",
                "veg_count": 60,
                "nonveg_count": 40,
                "jain_count": 20,
                "checkin_date": target_date.isoformat(),
                "checkout_date": (target_date + timedelta(days=2)).isoformat(),
                "banquet": True,
                "injected": True,
            },
            emitted_by="scenario.injector",
            cascade_id=cascade_id,
            sim_ts=clock.sim_now,
        )

    elif body.scenario == "ac_failure_block_c":
        db = SessionLocal()
        try:
            from backend.models.assets import Asset
            ac = db.query(Asset).filter(Asset.kind == "ac", Asset.health_score < 50).first()
            asset_id = ac.id if ac else 1
            if ac:
                ac.health_score = 15.0
                ac.predicted_days_to_failure = 0.5
                db.commit()
        finally:
            db.close()
        await bus.publish(
            "asset.reading",
            payload={"asset_id": asset_id, "metric": "cooling_temp", "value": 28.5, "anomaly": True},
            emitted_by="scenario.injector",
            cascade_id=cascade_id,
            sim_ts=clock.sim_now,
        )

    elif body.scenario == "rain_tomorrow":
        await bus.publish(
            "weather.forecast_changed",
            payload={"from": "sunny", "to": "rain", "rain_prob": 0.85, "injected": True},
            emitted_by="scenario.injector",
            cascade_id=cascade_id,
            sim_ts=clock.sim_now,
        )

    elif body.scenario == "staff_no_show":
        db = SessionLocal()
        try:
            from backend.models.people import Staff
            s = db.query(Staff).filter(Staff.status == "idle").first()
            if s:
                s.status = "off"
                db.commit()
                staff_id = s.id
                staff_name = s.name
            else:
                staff_id, staff_name = 1, "Staff Member"
        finally:
            db.close()
        await bus.publish(
            "staff.no_show",
            payload={"staff_id": staff_id, "staff_name": staff_name},
            emitted_by="scenario.injector",
            cascade_id=cascade_id,
            sim_ts=clock.sim_now,
        )

    elif body.scenario == "bad_review_risk":
        db = SessionLocal()
        try:
            from backend.models.guests import Guest
            g = db.query(Guest).first()
            if g:
                g.gers_score = 76.0
                g.gers_drivers = json.dumps([
                    "AC reported not cooling — ticket open 2h",
                    "No response to room service request",
                    "2nd stay with unresolved issues",
                ])
                db.commit()
                guest_id = g.id
            else:
                guest_id = 1
        finally:
            db.close()
        await bus.publish(
            "guest.risk_raised",
            payload={"guest_id": guest_id, "gers_score": 76.0, "band": "critical"},
            emitted_by="scenario.injector",
            cascade_id=cascade_id,
            sim_ts=clock.sim_now,
        )

    elif body.scenario == "festival_weekend":
        await bus.publish(
            "calendar.event_added",
            payload={
                "name": "Ganesh Chaturthi Weekend",
                "date": (clock.sim_now + timedelta(days=5)).isoformat(),
                "demand_multiplier": 1.45,
                "injected": True,
            },
            emitted_by="scenario.injector",
            cascade_id=cascade_id,
            sim_ts=clock.sim_now,
        )

    return {"cascade_id": cascade_id, "scenario": body.scenario, "sim_ts": clock.sim_now.isoformat()}


@router.post("/whatif")
def what_if(body: WhatIfBody):
    """Forward projection: staffing / inventory / pricing / risk for a given scenario."""
    import math
    target_date = datetime.fromisoformat(body.date)
    days_out = (target_date - clock.sim_now).days
    occ = body.occupancy
    rooms_occ = int(occ * 84)

    # Staffing projection
    projected_staff = {
        "housekeeping": math.ceil(rooms_occ * 0.12),
        "fnb": math.ceil(rooms_occ * 0.10),
        "maintenance": 6,
        "frontdesk": 4,
        "spa": 4 if occ > 0.7 else 3,
        "security": 4,
        "chef": math.ceil(rooms_occ * 0.05),
    }
    total_staff_needed = sum(projected_staff.values())

    # Inventory projection (simplified)
    daily_food_cost = rooms_occ * 1800  # avg F&B per room
    total_inventory_value = daily_food_cost * 3  # 3-day lead buffer

    # Pricing projection
    demand_mult = 1.0
    if occ > 0.85: demand_mult = 1.28
    elif occ > 0.75: demand_mult = 1.15
    elif occ > 0.65: demand_mult = 1.05
    if body.has_event: demand_mult *= 1.20
    if body.weather == "rain": demand_mult *= 0.95

    avg_rate = 9500 * demand_mult
    projected_rev = avg_rate * rooms_occ

    # Risk hotspots
    risk_hotspots = []
    if occ > 0.90:
        risk_hotspots.append({"zone": "Front Desk", "risk": "high", "reason": "Check-in queue at 95%+ occupancy"})
    if body.has_event:
        risk_hotspots.append({"zone": "Mahal Banquet", "risk": "high", "reason": "Event staffing pressure"})

    return {
        "date": body.date,
        "occupancy": occ,
        "occupied_rooms": rooms_occ,
        "weather": body.weather,
        "has_event": body.has_event,
        "days_out": days_out,
        "projected_staff": projected_staff,
        "total_staff_needed": total_staff_needed,
        "projected_daily_revenue": round(projected_rev, 2),
        "avg_projected_rate": round(avg_rate, 2),
        "demand_multiplier": round(demand_mult, 3),
        "inventory_value_to_order": round(total_inventory_value, 2),
        "risk_hotspots": risk_hotspots,
    }


@router.post("/reset")
async def reset_demo():
    """Reset to a known demo state in < 5 seconds."""
    db = SessionLocal()
    try:
        # Reset clock
        clock.reset(datetime(2026, 9, 6, 8, 0, 0))

        # Clear ledger
        from backend.core.ledger import ledger
        ledger.clear()

        # Clear bus replay buffer
        bus.clear()

        # Reset key guest GERS
        from backend.models.guests import Guest
        import json as _json
        g = db.query(Guest).first()
        if g:
            g.gers_score = 65.0
            g.gers_drivers = _json.dumps([
                "2 open maintenance tickets",
                "AC reported not cooling",
                "No concierge contact in 3 hours",
            ])

        # Reset degrading assets
        from backend.models.assets import Asset
        degrading = db.query(Asset).filter(Asset.health_score < 50).all()
        for a in degrading:
            a.health_score = 35.0
            a.predicted_days_to_failure = 5.0

        db.commit()
    finally:
        db.close()

    return {"status": "reset", "sim_now": clock.sim_now.isoformat()}
