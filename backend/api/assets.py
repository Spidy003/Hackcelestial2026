"""Assets & Maintenance API."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.models import get_db
from backend.models.assets import Asset, Telemetry, Inspection

router = APIRouter()

@router.get("/assets")
def get_assets(db: Session = Depends(get_db)):
    return [a.to_dict() for a in db.query(Asset).order_by(Asset.health_score).all()]

@router.get("/assets/{asset_id}/telemetry")
def get_telemetry(asset_id: int, limit: int = 100, db: Session = Depends(get_db)):
    rows = (
        db.query(Telemetry)
        .filter(Telemetry.asset_id == asset_id)
        .order_by(Telemetry.ts.desc())
        .limit(limit)
        .all()
    )
    return [r.to_dict() for r in rows]

@router.get("/assets/{asset_id}/inspections")
def get_inspections(asset_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Inspection)
        .filter(Inspection.asset_id == asset_id)
        .order_by(Inspection.ts.desc())
        .limit(20)
        .all()
    )
    return [r.to_dict() for r in rows]
