"""Revenue API."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from backend.models import get_db
from backend.models.revenue import ServiceSlot, RateCalendar, Offer

router = APIRouter()

@router.get("/slots")
def get_slots(db: Session = Depends(get_db)):
    return [s.to_dict() for s in db.query(ServiceSlot).filter(
        ServiceSlot.start_ts > datetime.utcnow()
    ).order_by(ServiceSlot.start_ts).limit(80).all()]

@router.get("/rates")
def get_rates(date: str = None, room_type_id: int = None, db: Session = Depends(get_db)):
    q = db.query(RateCalendar)
    if date:
        d = datetime.fromisoformat(date)
        q = q.filter(RateCalendar.date >= d)
    if room_type_id:
        q = q.filter(RateCalendar.room_type_id == room_type_id)
    return [r.to_dict() for r in q.order_by(RateCalendar.date).limit(90).all()]

@router.get("/offers")
def get_offers(status: str = "pending", db: Session = Depends(get_db)):
    return [o.to_dict() for o in db.query(Offer).filter(Offer.status == status).all()]

@router.get("/segments")
def get_segments(db: Session = Depends(get_db)):
    from backend.models.intelligence import Segment
    return [s.to_dict() for s in db.query(Segment).all()]

@router.get("/feedback/report")
def get_feedback_report(db: Session = Depends(get_db)):
    from backend.models.intelligence import Feedback
    rows = db.query(Feedback).order_by(Feedback.ts.desc()).limit(100).all()
    total = len(rows)
    positive = sum(1 for f in rows if f.sentiment == "positive")
    negative = sum(1 for f in rows if f.sentiment == "negative")
    avg_rating = sum(f.rating for f in rows) / total if total else 0
    return {
        "total": total,
        "positive": positive,
        "negative": negative,
        "avg_rating": round(avg_rating, 2),
        "recent": [f.to_dict() for f in rows[:20]],
    }
