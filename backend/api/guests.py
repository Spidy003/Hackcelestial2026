"""Guests & Bookings API."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.models import get_db
from backend.models.guests import Guest, Booking

router = APIRouter()

@router.get("/guests")
def get_guests(db: Session = Depends(get_db)):
    return [g.to_dict() for g in db.query(Guest).limit(300).all()]

@router.get("/guests/{guest_id}")
def get_guest(guest_id: int, db: Session = Depends(get_db)):
    g = db.query(Guest).get(guest_id)
    if not g:
        raise HTTPException(404)
    result = g.to_dict()
    result["bookings"] = [b.to_dict() for b in g.bookings]
    return result

@router.get("/bookings")
def get_bookings(status: str = None, db: Session = Depends(get_db)):
    q = db.query(Booking)
    if status:
        q = q.filter(Booking.status == status)
    return [b.to_dict() for b in q.order_by(Booking.checkin_date.desc()).limit(200).all()]


class BookingQuoteRequest(BaseModel):
    checkin_date: str
    checkout_date: str
    adults: int = 2
    children: int = 0
    party_size: int = 2
    room_type_id: int = 1
    guest_id: int = None
    occasion: str = "none"


@router.post("/bookings/quote")
async def get_booking_quote(req: BookingQuoteRequest, db: Session = Depends(get_db)):
    """Live personalised price + occasion detection + bundle recommendation."""
    from backend.models.revenue import RateCalendar
    from datetime import datetime

    ci = datetime.fromisoformat(req.checkin_date)
    rate_row = db.query(RateCalendar).filter(
        RateCalendar.room_type_id == req.room_type_id,
        RateCalendar.date >= ci,
    ).first()

    base_price = rate_row.current_rate if rate_row else 8500.0

    # Weekend uplift
    is_weekend = ci.weekday() >= 4
    final_price = base_price * (1.15 if is_weekend else 1.0)

    # Occasion confidence (rule-based fallback)
    occasion_confidence = 0.0
    detected_occasion = req.occasion
    if req.party_size >= 50:
        detected_occasion = "wedding"
        occasion_confidence = 0.92
    elif req.party_size >= 2 and req.adults == 2 and req.children == 0:
        detected_occasion = "honeymoon"
        occasion_confidence = 0.71

    bundles = [
        {
            "name": "Welcome Package",
            "description": "Early check-in + flower petals + bottle of wine",
            "price": 2500,
            "margin": 1800,
        },
        {
            "name": "Spa Escape",
            "description": "2x 60min massage + private pool access",
            "price": 7500,
            "margin": 4200,
        },
        {
            "name": "Romantic Dinner",
            "description": "Private beach dinner for 2 with sunset views",
            "price": 5500,
            "margin": 3100,
        },
    ]

    return {
        "base_rate": round(base_price, 2),
        "final_rate": round(final_price, 2),
        "is_weekend": is_weekend,
        "weekend_uplift_pct": 15 if is_weekend else 0,
        "detected_occasion": detected_occasion,
        "occasion_confidence": round(occasion_confidence, 2),
        "recommended_bundles": bundles,
        "rate_reason": rate_row.reason if rate_row else "baseline",
    }


# ─────────────────────────────────────────────────────────────
# 1. Personalized Occasion & Group Booking
# ─────────────────────────────────────────────────────────────

class PersonalizedBookingRequest(BaseModel):
    name: str
    phone: str = "+91 98200 12345"
    language: str = "en"
    checkin_date: str
    checkout_date: str
    party_size: int = 2
    adults: int = 2
    children: int = 0
    occasion: str = "general"   # wedding | group | family_kids | honeymoon | general
    room_type_id: int = 1
    selected_bundle_id: str = "welcome_amenity"
    bundle_name: str = "Signature Welcome Package"
    bundle_price: float = 2500.0
    food_plan: str = "maharashtrian_royal"  # maharashtrian_royal | coastal_seafood | jain_pure_veg | kids_special | chef_tasting
    veg_count: int = 1
    nonveg_count: int = 1
    jain_count: int = 0
    special_notes: str = ""


@router.post("/guests/create-personalized-booking")
async def create_personalized_booking(req: PersonalizedBookingRequest, db: Session = Depends(get_db)):
    """Create a high-touch personalized booking with AI bundle, venue allocation, and custom food selection."""
    from datetime import datetime
    import json
    from backend.core.bus import bus
    from backend.core.broadcast import manager

    # 1. Get or create guest
    guest = db.query(Guest).filter(Guest.name.ilike(req.name.strip())).first()
    if not guest:
        loyalty = "platinum" if req.party_size >= 40 else ("gold" if req.party_size >= 10 else "silver")
        guest = Guest(
            name=req.name.strip(),
            phone=req.phone.strip(),
            language=req.language,
            loyalty_tier=loyalty,
            stays_count=1,
            lifetime_value=req.bundle_price + (req.party_size * 8500),
            avg_rating_given=4.9,
            gers_score=92.0,
            gers_drivers=json.dumps([f"Personalized {req.occasion} package", f"Custom food: {req.food_plan}"]),
            preferences=json.dumps({
                "occasion": req.occasion,
                "food_plan": req.food_plan,
                "party_size": req.party_size,
                "special_notes": req.special_notes,
            }),
        )
        db.add(guest)
        db.flush()
    else:
        guest.stays_count += 1
        guest.lifetime_value += req.bundle_price + (req.party_size * 8500)

    # 2. Compute rate & venue recommendations based on occasion
    try:
        ci = datetime.fromisoformat(req.checkin_date)
        co = datetime.fromisoformat(req.checkout_date)
    except Exception:
        ci = datetime.utcnow()
        co = datetime.utcnow()

    nights = max(1, (co - ci).days)
    base_nightly_rate = 8500.0
    if req.occasion == "wedding":
        base_nightly_rate = 14500.0  # Includes Mahal Banquet Hall & Lawns access
        venue_assigned = "Mahal Banquet Hall & Mandwa Coastal Lawns"
    elif req.occasion == "group":
        base_nightly_rate = 9500.0   # Includes Ananda Spa Group Cabana & Beach Sports
        venue_assigned = "Poolside Cabana Deck & Beach Activity Center"
    elif req.occasion == "family_kids":
        base_nightly_rate = 11000.0  # Includes Kids Water Park Splash Passes
        venue_assigned = "Kids Water Park & Family Lagoon Villa"
    elif req.occasion == "honeymoon":
        base_nightly_rate = 13500.0  # Includes Sunset Catamaran & Beachfront Cabana
        venue_assigned = "Private Beachfront Villa & Catamaran Deck"
    else:
        venue_assigned = "Deluxe Garden Suites"

    total_rate = (base_nightly_rate * nights) + req.bundle_price

    bundle_record = [{
        "id": req.selected_bundle_id,
        "name": req.bundle_name,
        "price": req.bundle_price,
        "venue": venue_assigned,
        "food_plan": req.food_plan,
    }]

    # 3. Create booking
    booking = Booking(
        guest_id=guest.id,
        room_id=req.room_type_id,
        channel="direct_ai_portal",
        checkin_date=ci,
        checkout_date=co,
        nights=nights,
        adults=req.adults,
        children=req.children,
        party_size=req.party_size,
        occasion=req.occasion,
        veg_count=req.veg_count,
        nonveg_count=req.nonveg_count,
        jain_count=req.jain_count,
        rate_locked=total_rate,
        addons=json.dumps([req.food_plan, req.bundle_name]),
        status="confirmed",
        occasion_confidence=0.96,
        recommended_bundle=json.dumps(bundle_record),
    )
    db.add(booking)

    # Allocate rooms for party size and mark as occupied
    try:
        from backend.models.resort import Room
        rooms_needed = max(1, (req.party_size + 1) // 2)
        vacant_rooms = db.query(Room).filter(Room.status != "occupied").limit(rooms_needed).all()
        for vr in vacant_rooms:
            vr.status = "occupied"
    except Exception:
        pass

    db.commit()
    db.refresh(booking)

    # 4. Notify EventBus
    try:
        await bus.publish(
            "booking.created",
            payload={
                "booking_id": booking.id,
                "guest_id": guest.id,
                "occasion": req.occasion,
                "party_size": req.party_size,
                "food_plan": req.food_plan,
                "venue_assigned": venue_assigned,
                "total_rate": total_rate,
            },
            emitted_by="guest_portal",
            cascade_id=f"cascade-book-{booking.id}",
            sim_ts=datetime.utcnow(),
        )
    except Exception:
        pass

    # 5. Broadcast live patch
    try:
        await manager.broadcast_patch(
            paths={
                "latest_booking": booking.to_dict(),
                "guest_profile": guest.to_dict(),
                "restaurant_covers_update": {
                    "food_plan": req.food_plan,
                    "party_size": req.party_size,
                    "veg": req.veg_count,
                    "nonveg": req.nonveg_count,
                    "jain": req.jain_count,
                }
            },
            sim_ts=datetime.utcnow(),
        )
    except Exception:
        pass

    return {
        "status": "confirmed",
        "booking_id": booking.id,
        "guest_id": guest.id,
        "guest_name": guest.name,
        "occasion": req.occasion,
        "venue_assigned": venue_assigned,
        "food_plan": req.food_plan,
        "party_size": req.party_size,
        "nights": nights,
        "total_amount": total_rate,
        "bundle": bundle_record,
        "message": f"Congratulations {guest.name}! Your {req.occasion} package at {venue_assigned} is confirmed with custom {req.food_plan} catering.",
    }


# ─────────────────────────────────────────────────────────────
# 2. Fast Guest Ticketing & Services (Spa, Cab, Housekeeping, etc.)
# ─────────────────────────────────────────────────────────────

class RaiseTicketRequest(BaseModel):
    guest_id: int = 101
    guest_name: str = "In-House Guest"
    room_number: str = "Villa 104"
    ticket_type: str  # spa | cab | housekeeping | dining | maintenance
    title: str
    details: str
    priority: int = 2  # 1 (critical) to 4 (low)


@router.post("/guests/raise-ticket")
async def raise_guest_ticket(req: RaiseTicketRequest, db: Session = Depends(get_db)):
    """Create a guest service request or maintenance ticket and dispatch across agents."""
    from datetime import datetime
    from backend.models.people import Task
    from backend.core.bus import bus
    from backend.core.broadcast import manager

    # Map ticket type to appropriate operational department & zone
    type_map = {
        "spa": {"zone_id": 4, "dept": "Ananda Spa & Wellness", "eta": 15, "priority": 2},
        "cab": {"zone_id": 8, "dept": "Mandwa Transport & Jetty", "eta": 10, "priority": 1},
        "housekeeping": {"zone_id": 1, "dept": "Villa Housekeeping", "eta": 12, "priority": 2},
        "dining": {"zone_id": 2, "dept": "Sagar Dining & Room Service", "eta": 20, "priority": 2},
        "maintenance": {"zone_id": 1, "dept": "Engineering & HVAC", "eta": 15, "priority": 1},
    }

    info = type_map.get(req.ticket_type, {"zone_id": 1, "dept": "Concierge Hub", "eta": 15, "priority": req.priority})

    task = Task(
        type=req.ticket_type,
        title=f"[{req.room_number}] {req.title}",
        priority=info["priority"],
        source="guest_app",
        zone_id=info["zone_id"],
        guest_id=req.guest_id,
        created_at=datetime.utcnow(),
        status="assigned",
        sla_minutes=info["eta"],
        est_minutes=info["eta"],
        sla_remaining=float(info["eta"]),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Publish to bus
    try:
        await bus.publish(
            "guest.request",
            payload={
                "task_id": task.id,
                "guest_id": req.guest_id,
                "text": f"{req.title}: {req.details}",
                "room": req.room_number,
                "department": info["dept"],
            },
            emitted_by="guest_portal",
            cascade_id=f"cascade-task-{task.id}",
            sim_ts=datetime.utcnow(),
        )
    except Exception:
        pass

    # Broadcast live update
    try:
        await manager.broadcast_patch(
            paths={
                "new_ticket": task.to_dict(),
                "recent_service_request": f"{req.room_number} requested {req.title}"
            },
            sim_ts=datetime.utcnow(),
        )
    except Exception:
        pass

    return {
        "status": "dispatched",
        "ticket_id": task.id,
        "title": task.title,
        "department": info["dept"],
        "eta_minutes": info["eta"],
        "assigned_status": "Assigned to on-duty staff",
        "message": f"Your request for '{req.title}' has been dispatched to {info['dept']}. Staff arriving within {info['eta']} mins.",
    }


# ─────────────────────────────────────────────────────────────
# 3. Guest Feedback & Sentiment Escalation to Owner Dashboard
# ─────────────────────────────────────────────────────────────

class GuestFeedbackRequest(BaseModel):
    guest_id: int = 103
    guest_name: str = "Kavita Iyer"
    room_number: str = "Villa 104"
    rating: float  # 1.0 to 5.0
    category: str = "stay"  # stay | dining | spa | housekeeping
    review_text: str
    aspects: list = []


@router.post("/guests/submit-feedback")
async def submit_guest_feedback(req: GuestFeedbackRequest, db: Session = Depends(get_db)):
    """Save guest feedback. If rating <= 2, automatically trigger urgent alert in Owner Dashboard."""
    from datetime import datetime
    import json
    from backend.models.intelligence import Feedback, Alert
    from backend.core.bus import bus
    from backend.core.broadcast import manager

    is_negative = req.rating <= 2.5
    overall_sentiment = "negative" if req.rating <= 2.5 else ("positive" if req.rating >= 4.0 else "neutral")

    feedback = Feedback(
        guest_id=req.guest_id,
        ts=datetime.utcnow(),
        source="app",
        rating=req.rating,
        text=req.review_text,
        sentiment=overall_sentiment,
        aspects=json.dumps(req.aspects or [{"aspect": req.category, "polarity": overall_sentiment}]),
        root_cause_ref=req.room_number,
    )
    db.add(feedback)

    # If negative (1-2 stars), trigger critical escalation
    alert_obj = None
    if is_negative:
        alert_obj = Alert(
            ts=datetime.utcnow(),
            severity="critical",
            agent="sentiment",
            message=f"🚨 Guest Escalation [{req.room_number} - {req.guest_name}]: {req.rating}★ Review - '{req.review_text}'",
            entity_ref=f"guest:{req.guest_id}",
            acknowledged=False,
        )
        db.add(alert_obj)

        # Update guest GERS score
        g = db.query(Guest).get(req.guest_id)
        if g:
            g.gers_score = max(25.0, g.gers_score - 25.0)
            drivers = g.gers_drivers_list()
            drivers.insert(0, f"Critical {req.rating}★ feedback: {req.review_text[:40]}...")
            g.gers_drivers = json.dumps(drivers[:5])

    db.commit()
    db.refresh(feedback)
    if alert_obj:
        db.refresh(alert_obj)

    # Publish events
    try:
        await bus.publish(
            "feedback.submitted",
            payload={
                "guest_id": req.guest_id,
                "guest_name": req.guest_name,
                "rating": req.rating,
                "text": req.review_text,
                "room": req.room_number,
                "is_negative": is_negative,
            },
            emitted_by="guest_portal",
            cascade_id=f"cascade-fb-{feedback.id}",
            sim_ts=datetime.utcnow(),
        )

        if is_negative and alert_obj:
            await bus.publish(
                "guest.risk_raised",
                payload={
                    "guest_id": req.guest_id,
                    "rating": req.rating,
                    "alert_id": alert_obj.id,
                    "room": req.room_number,
                    "complaint": req.review_text,
                },
                emitted_by="sentiment",
                cascade_id=f"cascade-fb-{feedback.id}",
                sim_ts=datetime.utcnow(),
            )
    except Exception:
        pass

    # Broadcast via WebSocket
    try:
        await manager.broadcast_patch(
            paths={
                "latest_feedback": feedback.to_dict(),
                "escalated_alert": alert_obj.to_dict() if alert_obj else None,
            },
            sim_ts=datetime.utcnow(),
        )
    except Exception:
        pass

    return {
        "status": "received",
        "feedback_id": feedback.id,
        "rating": req.rating,
        "sentiment": overall_sentiment,
        "escalated_to_owner": is_negative,
        "alert_id": alert_obj.id if alert_obj else None,
        "message": "Thank you for your feedback!" if not is_negative else "We sincerely apologize for your experience. An executive service recovery has been dispatched directly to the General Manager & Owner.",
    }


class CheckoutRequest(BaseModel):
    guest_id: Optional[int] = None
    guest_name: Optional[str] = None
    room_number: Optional[str] = None


@router.post("/guests/checkout")
async def checkout_guest(req: CheckoutRequest, db: Session = Depends(get_db)):
    """Check out an in-house guest, release room to vacant_dirty, dispatch housekeeping turnaround, and broadcast update."""
    from backend.models.resort import Room
    from backend.models.people import Task
    from backend.core.bus import bus
    from backend.core.broadcast import manager
    from datetime import datetime
    import re

    # 1. Update room status to vacant_dirty
    room = None
    if req.room_number:
        digits = re.findall(r'\d+', req.room_number)
        room_num = digits[-1] if digits else req.room_number
        room = db.query(Room).filter(Room.number == room_num).first()

    if not room:
        room = db.query(Room).filter(Room.status == "occupied").first()

    if room:
        room.status = "vacant_dirty"
        db.commit()

    # 2. Dispatch housekeeping turnaround task
    try:
        task = Task(
            title=f"Turnaround & Sanitization: {req.room_number or (room.number if room else 'Suite')}",
            description=f"Guest checkout completed for {req.guest_name or 'In-House Guest'}. Full linen turnover, deep sanitization, and minibar restock.",
            zone_id=room.zone_id if room else 1,
            role_required="housekeeping",
            priority="high",
            sla_minutes=30,
            status="open",
        )
        db.add(task)
        db.commit()
    except Exception:
        pass

    # 3. Publish checkout event
    try:
        await bus.publish(
            "guest.checked_out",
            payload={
                "guest_name": req.guest_name,
                "room_number": req.room_number,
                "room_id": room.id if room else None,
                "checkout_ts": datetime.utcnow().isoformat(),
            },
            emitted_by="guest_portal",
            cascade_id=f"cascade-co-{int(datetime.utcnow().timestamp())}",
            sim_ts=datetime.utcnow(),
        )
    except Exception:
        pass

    # 4. Broadcast live patch
    try:
        total_rooms = db.query(Room).count() or 84
        occupied_rooms = db.query(Room).filter(Room.status == "occupied").count()
        occupancy_pct = round((occupied_rooms / total_rooms * 100), 1)

        await manager.broadcast_patch(
            paths={
                "kpis.occupied_rooms": occupied_rooms,
                "kpis.occupancy_pct": occupancy_pct,
                "latest_checkout": {
                    "guest_name": req.guest_name,
                    "room_number": req.room_number,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            },
            sim_ts=datetime.utcnow(),
        )
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Checkout processed for {req.guest_name or 'guest'}. Housekeeping turnaround task dispatched.",
        "room_status": "vacant_dirty",
        "room_number": req.room_number,
    }
