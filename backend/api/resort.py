"""Resort/Zones/Rooms API."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.models import get_db
from backend.models.resort import Zone, Room, RoomType
from backend.models.intelligence import Alert
from backend.core.bus import bus
from backend.core.ledger import ledger

router = APIRouter()

# In-memory record of real-time operations dispatched by leadership
DISPATCHED_OPERATIONS: List[Dict[str, Any]] = [
    {
        "id": "disp-init-pool",
        "alert_id": "alt-pool",
        "action_name": "Swimming Pool Circulation Pump Serviced & Flow Restored",
        "department": "Facility Maintenance & Engineering",
        "target_zone": "swimming-pool",
        "risk_reduction": "82% → 24%",
        "load_reduction": "Normal flow rate restored (180 L/min)",
        "details": "Technician dispatched to secondary filter. Flow rate normalized within 4 hours, averting pool closure.",
        "staff_allocated": 1,
        "rupee_impact": 45000.0,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    },
    {
        "id": "disp-init-dining",
        "alert_id": "alt-restaurant",
        "action_name": "Sagar / Mandwa Restaurant Peak Staff Reallocation",
        "department": "Food & Beverage Operations",
        "target_zone": "sagar-restaurant",
        "risk_reduction": "86% → 54%",
        "load_reduction": "Table wait reduced from 18m to 4m",
        "details": "2 waitstaff dynamically reassigned from calm villa zone to restaurant floor during peak dinner hours.",
        "staff_allocated": 2,
        "rupee_impact": 38000.0,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    }
]

class DispatchActionRequest(BaseModel):
    alert_id: Optional[str] = None
    action_name: str
    department: str = "Executive Operations"
    target_zone: str = "general"
    risk_reduction: str = "Risk normalized"
    load_reduction: str = "Load balanced"
    details: str = ""
    staff_allocated: int = 1
    rupee_impact: float = 35000.0

ZONE_OVERRIDES: Dict[str, Dict[str, Any]] = {
    "swimming-pool": {"load": 24, "status": "Optimal", "statusType": "calm", "staffBoost": 1, "subtitle": "4 Staff Working • 24% Risk (Restored)"},
    "sagar-restaurant": {"load": 54, "status": "Balanced", "statusType": "calm", "staffBoost": 2, "staffOnDuty": 16, "subtitle": "16 Staff Working • 54% Load (Balanced)"},
    "villa-zone-a": {"load": 38, "status": "Optimal", "statusType": "calm", "staffBoost": 0, "subtitle": "12 Staff Working • 38% Load (Turn-Down Active)"}
}

@router.get("/zones")
def get_zones(db: Session = Depends(get_db)):
    return [z.to_dict() for z in db.query(Zone).all()]

@router.get("/rooms")
def get_rooms(db: Session = Depends(get_db)):
    return [r.to_dict() for r in db.query(Room).all()]

@router.get("/room-types")
def get_room_types(db: Session = Depends(get_db)):
    return [rt.to_dict() for rt in db.query(RoomType).all()]

@router.get("/state/snapshot")
async def get_state_snapshot():
    from backend.main import _build_snapshot
    return await _build_snapshot()

@router.get("/dispatched-actions")
def get_dispatched_actions():
    return {
        "status": "success",
        "operations": DISPATCHED_OPERATIONS,
        "active_count": len(DISPATCHED_OPERATIONS),
        "zone_overrides": ZONE_OVERRIDES
    }

@router.post("/dispatch-action")
async def dispatch_action(req: DispatchActionRequest, db: Session = Depends(get_db)):
    op_id = f"disp-{int(datetime.utcnow().timestamp())}"
    op_record = {
        "id": op_id,
        "alert_id": req.alert_id,
        "action_name": req.action_name,
        "department": req.department,
        "target_zone": req.target_zone,
        "risk_reduction": req.risk_reduction,
        "load_reduction": req.load_reduction,
        "details": req.details,
        "staff_allocated": req.staff_allocated,
        "rupee_impact": req.rupee_impact,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    }

    # Prepend to memory list
    DISPATCHED_OPERATIONS.insert(0, op_record)

    # 1. Update Database Zone records
    target = req.target_zone.lower()
    zone_query = None
    if "pool" in target:
        zone_query = db.query(Zone).filter(Zone.name.ilike("%pool%") | (Zone.kind == "pool")).first()
    elif "restaurant" in target or "sagar" in target or "dining" in target:
        zone_query = db.query(Zone).filter(Zone.name.ilike("%sagar%") | (Zone.kind == "fnb")).first()
    elif "villa" in target or "room" in target or "turn-down" in target:
        zone_query = db.query(Zone).filter(Zone.name.ilike("%block%") | (Zone.kind == "rooms")).first()
    elif "kitchen" in target or "chiller" in target:
        zone_query = db.query(Zone).filter(Zone.name.ilike("%kitchen%") | (Zone.kind == "kitchen")).first()
    elif "spa" in target:
        zone_query = db.query(Zone).filter(Zone.kind == "spa").first()
    elif "banquet" in target:
        zone_query = db.query(Zone).filter(Zone.kind == "banquet").first()
    else:
        zone_query = db.query(Zone).first()

    if zone_query:
        zone_query.staff_on_duty = max(zone_query.staff_on_duty + req.staff_allocated, 4)
        zone_query.workload_index = max(18.0, round(zone_query.workload_index * 0.5, 1))
        zone_query.backlog_count = max(0, zone_query.backlog_count - 2)

    # 2. Update Asset health if maintenance/equipment related
    from backend.models.assets import Asset
    action_lower = req.action_name.lower()
    if any(k in action_lower for k in ["pump", "filter", "chiller", "compressor", "ac", "geyser", "service", "maintenance"]):
        assets = db.query(Asset).all()
        for a in assets:
            if ("pump" in action_lower and a.kind == "pump") or \
               ("compressor" in action_lower and a.kind in ("ac", "kitchen_equip")) or \
               ("filter" in action_lower and a.kind in ("pump", "pool_filter")) or \
               (zone_query and a.zone_id == zone_query.id):
                a.health_score = 98.5
                a.last_service_date = datetime.utcnow()
                a.predicted_days_to_failure = 320.0
                a.revenue_exposure = 0.0

    try:
        db.commit()
    except Exception:
        db.rollback()

    # 3. Update ZONE_OVERRIDES map for real-time frontend pin sync
    load_val = 24 if "pool" in target else 54 if "restaurant" in target else 38 if "villa" in target else 32
    ZONE_OVERRIDES[req.target_zone] = {
        "load": load_val,
        "status": "Optimal" if load_val <= 40 else "Balanced",
        "statusType": "calm",
        "staffBoost": req.staff_allocated,
        "subtitle": f"{req.staff_allocated + 4} Staff Working • {req.risk_reduction} (Restored)"
    }

    # 4. Publish real-time event to event bus for all agents
    await bus.publish(
        event_type="operation.dispatched",
        payload=op_record,
        emitted_by="owner.dispatch_action"
    )

    # 5. Record decision into ledger
    from backend.core.ledger import Decision
    dec = Decision(
        agent="operations_hub",
        kind="dispatch_execution",
        title=req.action_name,
        reasoning_steps=[
            f"Executive leadership dispatched: {req.action_name}",
            f"Target Facility: {req.target_zone} | Department: {req.department}",
            f"Risk Reduction Outcome: {req.risk_reduction}",
            f"Workload Normalization: {req.load_reduction}",
            f"Staff Allocated: +{req.staff_allocated} personnel",
            "Real-time event synchronized across all 8 resort AI agents and facilities"
        ],
        inputs=req.dict(),
        confidence=0.99,
        rupee_impact=req.rupee_impact,
        counterfactual_text=f"Prevented severe service disruption and protected guest satisfaction in {req.target_zone}.",
        counterfactual_rupees=req.rupee_impact,
        autonomy="approved",
    )
    await ledger.record(dec)

    # 5b. Acknowledge alert in database if an alert_id was passed
    from backend.models.intelligence import Alert
    if req.alert_id:
        try:
            alert_clean = req.alert_id.replace("alert-", "").replace("alt-", "")
            if alert_clean.isdigit():
                db_alert = db.query(Alert).get(int(alert_clean))
                if db_alert:
                    db_alert.acknowledged = True
                    db.commit()
        except Exception:
            pass

    # 6. Broadcast patch via WebSocket to all connected UI clients immediately
    from backend.core.broadcast import manager
    try:
        await manager.broadcast_patch(
            paths={
                "dispatched_operation": op_record,
                "zone_overrides": ZONE_OVERRIDES,
                "recent_dispatch": req.action_name,
                "resolved_alert_id": req.alert_id
            },
            sim_ts=datetime.utcnow(),
            decisions=[dec.to_dict()]
        )
    except Exception:
        pass

    return {
        "status": "success",
        "operation": op_record,
        "agents_notified": [
            "staffing", "maintenance", "inventory", "concierge", 
            "pricing", "sentiment", "personalization", "segmentation"
        ],
        "zone_overrides": ZONE_OVERRIDES
    }


@router.get("/alerts")
def get_resort_alerts(db: Session = Depends(get_db)):
    """Retrieve active unacknowledged alerts including escalated guest complaints."""
    from backend.models.intelligence import Alert
    alerts = db.query(Alert).filter(Alert.acknowledged == False).order_by(Alert.ts.desc()).limit(20).all()
    return [a.to_dict() for a in alerts]

