"""Decision Ledger API."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.core.ledger import ledger

router = APIRouter()

@router.get("")
def get_ledger(agent: str = None, status: str = None):
    decisions = ledger.all(agent=agent, status=status)
    return {
        "decisions": [d.to_dict() for d in decisions[:100]],
        "stats": ledger.stats(),
        "threshold_rupees": ledger.threshold_rupees,
    }

@router.get("/cascades/{cascade_id}")
def get_cascade(cascade_id: str):
    from backend.core.bus import bus
    events = [e.to_dict() for e in bus.replay() if e.cascade_id == cascade_id]
    decisions = [d.to_dict() for d in ledger.all() if d.cascade_id == cascade_id]
    return {"cascade_id": cascade_id, "events": events, "decisions": decisions}

@router.post("/{decision_id}/approve")
async def approve_decision(decision_id: str):
    d = await ledger.approve(decision_id)
    if not d:
        raise HTTPException(404, "Decision not found or not in 'proposed' state")

    # Real-time event bus publish & operations sync
    from datetime import datetime
    from backend.core.bus import bus
    from backend.api.resort import DISPATCHED_OPERATIONS, ZONE_OVERRIDES
    from backend.core.broadcast import manager

    target_zone = (d.inputs.get("zone_id") or d.inputs.get("zone") or "general") if d.inputs else "general"
    op_record = {
        "id": f"disp-rec-{d.id[:8]}",
        "alert_id": d.inputs.get("alert_id") if d.inputs else None,
        "action_name": d.title,
        "department": d.agent.replace("_", " ").title(),
        "target_zone": str(target_zone),
        "risk_reduction": "Operational risk mitigated",
        "load_reduction": "Balanced workload across shifts",
        "details": f"Executive approval granted for {d.agent} recommendation. Protected ₹{d.rupee_impact:,.0f} value.",
        "staff_allocated": d.inputs.get("staff_allocated", 1) if d.inputs else 1,
        "rupee_impact": d.rupee_impact,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    }
    DISPATCHED_OPERATIONS.insert(0, op_record)

    await bus.publish(
        event_type="decision.approved",
        payload={
            "decision_id": d.id,
            "agent": d.agent,
            "title": d.title,
            "rupee_impact": d.rupee_impact,
            "target_zone": str(target_zone),
        },
        emitted_by="owner.approve_decision"
    )

    try:
        await manager.broadcast_patch(
            paths={
                "dispatched_operation": op_record,
                "approved_decision": d.to_dict(),
                "zone_overrides": ZONE_OVERRIDES,
            },
            sim_ts=datetime.utcnow(),
            decisions=[d.to_dict()]
        )
    except Exception:
        pass

    return d.to_dict()

@router.post("/{decision_id}/reject")
async def reject_decision(decision_id: str):
    d = await ledger.reject(decision_id)
    if not d:
        raise HTTPException(404, "Decision not found or not in 'proposed' state")
    return d.to_dict()

@router.post("/{decision_id}/rollback")
async def rollback_decision(decision_id: str):
    d = await ledger.rollback(decision_id)
    if not d:
        raise HTTPException(404, "Decision not found or not rollbackable")
    return d.to_dict()


class AutononymyUpdate(BaseModel):
    threshold_rupees: float

@router.post("/autonomy")
def set_autonomy(body: AutononymyUpdate):
    ledger.set_threshold(body.threshold_rupees)
    return {"threshold_rupees": ledger.threshold_rupees}
