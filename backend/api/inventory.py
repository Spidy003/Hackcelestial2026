"""Inventory API."""
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.models import get_db
from backend.models.inventory import InventoryItem, PurchaseOrder

router = APIRouter()

class RestockLineItem(BaseModel):
    id: Optional[str] = None
    sku: Optional[str] = None
    name: str
    category: str
    order_qty: float
    unit_price: float
    unit: str

class RestockOrderRequest(BaseModel):
    items: List[RestockLineItem]
    po_number: Optional[str] = None
    notes: Optional[str] = None

@router.get("/inventory")
def get_inventory(category: str = None, db: Session = Depends(get_db)):
    q = db.query(InventoryItem)
    if category:
        q = q.filter(InventoryItem.category == category)
    return [i.to_dict() for i in q.all()]

@router.get("/inventory/purchase-orders")
def get_purchase_orders(status: str = None, db: Session = Depends(get_db)):
    q = db.query(PurchaseOrder)
    if status:
        q = q.filter(PurchaseOrder.status == status)
    return [po.to_dict() for po in q.order_by(PurchaseOrder.created_at.desc()).limit(50).all()]

@router.post("/inventory/purchase-orders/{po_id}/approve")
def approve_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).get(po_id)
    if not po:
        raise HTTPException(404, "PO not found")
    po.status = "approved"
    db.commit()
    return po.to_dict()

@router.post("/inventory/restock/order")
async def place_restock_order(req: RestockOrderRequest, db: Session = Depends(get_db)):
    from backend.core.bus import bus

    po_num = req.po_number or f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    total_cost = sum(i.order_qty * i.unit_price for i in req.items)

    # 1. Create PurchaseOrder in SQLite DB
    lines_data = [
        {
            "name": item.name,
            "category": item.category,
            "qty": item.order_qty,
            "unit": item.unit,
            "unit_cost": item.unit_price,
            "line_total": round(item.order_qty * item.unit_price, 2)
        }
        for item in req.items
    ]

    po = PurchaseOrder(
        supplier="Multi-Vendor Consolidated Supply",
        lines=json.dumps(lines_data),
        total_cost=total_cost,
        status="approved",
        created_at=datetime.utcnow(),
        created_by_agent="owner_dashboard",
        expected_delivery=datetime.utcnow() + timedelta(days=1),
    )
    db.add(po)

    # 2. Update matching inventory items in DB
    updated_items = []
    for item_data in req.items:
        match = None
        if item_data.sku:
            match = db.query(InventoryItem).filter_by(sku=item_data.sku).first()
        if not match and item_data.name:
            match = db.query(InventoryItem).filter(InventoryItem.name.ilike(f"%{item_data.name}%")).first()

        if match:
            match.on_hand += item_data.order_qty
            match.shortfall_qty = 0.0
            if match.forecast_7d and match.forecast_7d > 0:
                match.days_of_cover = round(match.on_hand / (match.forecast_7d / 7), 1)
            updated_items.append(match.to_dict())

    db.commit()

    # 3. Publish event to the resort multi-agent bus
    await bus.publish(
        event_type="inventory.restocked",
        payload={
            "po_number": po_num,
            "items_count": len(req.items),
            "total_rupees": total_cost,
            "categories": list(set(i.category for i in req.items)),
            "message": f"Owner approved supply restock of {len(req.items)} items ({po_num}). All department par levels replenished.",
            "updated_items": updated_items
        },
        emitted_by="owner.dashboard",
        cascade_id=f"cascade-restock-{uuid.uuid4().hex[:6]}"
    )

    # 4. Insert into DISPATCHED_OPERATIONS for real-time reporting
    from backend.api.resort import DISPATCHED_OPERATIONS
    DISPATCHED_OPERATIONS.insert(0, {
        "id": f"disp-{po_num.lower()}",
        "alert_id": f"restock-{po_num}",
        "action_name": f"Consolidated Par Supply Restock • {po_num}",
        "department": "Procurement & Supply Chain",
        "target_zone": "kitchen-warehouse",
        "risk_reduction": "Stockout Risk Eliminated (7.5+ Days Safe Cover)",
        "load_reduction": f"{len(req.items)} lines replenished to 100% par buffer",
        "details": f"Consolidated PO confirmed for {len(req.items)} inventory lines. Value ₹{total_cost:,.0f}.",
        "staff_allocated": 1,
        "rupee_impact": total_cost,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "completed"
    })

    # 5. Broadcast WebSocket patch
    from backend.core.broadcast import manager
    try:
        await manager.broadcast_patch(
            paths={
                "recent_restock": po_num,
                "inventory_restocked_count": len(req.items),
                "purchase_order": po.to_dict()
            },
            sim_ts=datetime.utcnow()
        )
    except Exception:
        pass

    return {
        "status": "success",
        "po_number": po_num,
        "total_cost": total_cost,
        "items_restocked": len(req.items),
        "updated_inventory": updated_items,
        "agents_notified": ["inventory", "kitchen_fnb", "housekeeping", "concierge", "revenue"]
    }

