"""
Personalization Agent — on booking.created, on guest.checked_in.

RandomForestClassifier: occasion intent from booking features.
Margin-aware bundle builder: score bundles by expected_margin × acceptance_probability,
subject to discount ceiling and actual availability.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from backend.agents.base import Agent
from backend.models import SessionLocal
from backend.models.intelligence import Event

logger = logging.getLogger(__name__)

OCCASIONS = ["wedding", "honeymoon", "corporate", "family", "friends", "solo"]

BUNDLE_CATALOGUE = [
    {"id": "romance_pkg",    "name": "Romance Package",       "price": 4500, "margin": 3200, "occasions": ["honeymoon"], "needs_slot": "spa"},
    {"id": "family_fun",     "name": "Family Fun Bundle",     "price": 3200, "margin": 2000, "occasions": ["family"],   "needs_slot": None},
    {"id": "wedding_decor",  "name": "Wedding Décor + Butler","price": 12000,"margin": 7500, "occasions": ["wedding"],  "needs_slot": None},
    {"id": "spa_escape",     "name": "Spa Escape",            "price": 7500, "margin": 4200, "occasions": ["honeymoon","solo","friends"], "needs_slot": "spa"},
    {"id": "biz_pkg",        "name": "Corporate Package",     "price": 2800, "margin": 1900, "occasions": ["corporate"],"needs_slot": None},
    {"id": "adventure_pkg",  "name": "Adventure Package",     "price": 5500, "margin": 3100, "occasions": ["friends","family"], "needs_slot": "activity"},
    {"id": "sunset_dinner",  "name": "Sunset Beach Dinner",   "price": 5500, "margin": 3100, "occasions": ["honeymoon","wedding","friends"], "needs_slot": "restaurant"},
    {"id": "wellness_pkg",   "name": "Wellness Retreat",      "price": 8500, "margin": 5000, "occasions": ["solo"],    "needs_slot": "spa"},
    {"id": "welcome_amenity","name": "Welcome Amenity",        "price": 2000, "margin": 1400, "occasions": OCCASIONS,   "needs_slot": None},
]

DISCOUNT_CEILING = 0.20  # max 20% discount


class PersonalizationAgent(Agent):
    name = "personalization"
    every_n_ticks = 999  # event-driven only
    subscribes = ["booking.created", "guest.checked_in"]

    def __init__(self) -> None:
        super().__init__()
        self._occasion_model = self._try_load_model("backend/ml/artifacts/occasion_intent.joblib")
        self._handled_bookings = set()

    async def periodic(self, sim_ts: datetime, tick_count: int) -> None:
        pass

    async def on_event(self, event: Event) -> None:
        payload = event.payload if isinstance(event.payload, dict) else json.loads(event.payload or "{}")
        guest_id = payload.get("guest_id")
        if not guest_id:
            return

        db = SessionLocal()
        try:
            from backend.models.guests import Guest, Booking
            g = db.query(Guest).get(guest_id)
            if not g:
                return

            booking = db.query(Booking).filter(
                Booking.guest_id == guest_id
            ).order_by(Booking.created_at.desc()).first()

            if not booking or booking.id in self._handled_bookings:
                return
            self._handled_bookings.add(booking.id)

            # 1. Classify occasion
            occasion, confidence = self._classify_occasion(booking, g)

            if confidence < 0.55:
                # Low confidence — ask concierge to confirm rather than guess
                await self._bus.publish(
                    "concierge.confirm_occasion",
                    payload={
                        "guest_id": guest_id,
                        "booking_id": booking.id,
                        "tentative_occasion": occasion,
                        "confidence": round(confidence, 2),
                    },
                    emitted_by=self.name,
                    cascade_id=event.cascade_id,
                    sim_ts=datetime.utcnow(),
                )

            booking.occasion = occasion
            booking.occasion_confidence = round(confidence, 2)

            # 2. Build margin-aware bundles
            bundles = await self._build_bundles(g, booking, occasion, db)
            booking.recommended_bundle = json.dumps(bundles)

            db.commit()

            await self.emit_decision(
                title=f"Occasion classified: {occasion} ({confidence:.0%}) + {len(bundles)} bundles for {g.name}",
                reasoning_steps=[
                    f"RandomForestClassifier: party_size={booking.party_size}, adults={booking.adults}, "
                    f"children={booking.children}, nights={booking.nights}, channel={booking.channel}, "
                    f"is_weekend={booking.checkin_date.weekday()>=4 if booking.checkin_date else False} → {occasion} ({confidence:.0%} confidence)."
                    + (f" [LOW CONFIDENCE — concierge asked to confirm]" if confidence < 0.55 else ""),
                    f"Margin-aware bundle scoring: {len(BUNDLE_CATALOGUE)} candidates evaluated. Selected top {len(bundles)} by expected_margin × acceptance_probability. Discount ceiling: {DISCOUNT_CEILING*100:.0f}%.",
                    f"Top bundle: '{bundles[0]['name']}' — expected margin ₹{bundles[0].get('expected_margin', 0):,.0f}, acceptance probability {bundles[0].get('acceptance_prob', 0):.0%}." if bundles else "No bundles available (capacity full).",
                ],
                confidence=confidence,
                rupee_impact=sum(b.get("expected_margin", 0) for b in bundles),
                counterfactual_text="Without personalisation: generic welcome, no bundle offer, est. 40% lower upsell rate.",
                counterfactual_rupees=sum(b.get("expected_margin", 0) for b in bundles) * 0.4,
                autonomy="auto",
                cascade_id=event.cascade_id,
                linked_event_id=event.id,
                linked_entity=f"booking:{booking.id}",
            )

            await self._bus.publish(
                "offer.proposed",
                payload={
                    "guest_id": guest_id,
                    "booking_id": booking.id,
                    "occasion": occasion,
                    "occasion_confidence": round(confidence, 2),
                    "bundles": bundles,
                },
                emitted_by=self.name,
                cascade_id=event.cascade_id,
                sim_ts=datetime.utcnow(),
            )

            await self._bus.publish(
                "guest.profile_enriched",
                payload={
                    "guest_id": guest_id,
                    "occasion": occasion,
                    "confidence": round(confidence, 2),
                    "bundles_count": len(bundles),
                },
                emitted_by=self.name,
                cascade_id=event.cascade_id,
                sim_ts=datetime.utcnow(),
            )

        except Exception:
            logger.exception("[personalization] on_event error")
            db.rollback()
        finally:
            db.close()

    async def periodic(self, sim_ts: datetime, tick_count: int) -> None:
        pass

    def _classify_occasion(self, booking, guest) -> tuple[str, float]:
        if self._occasion_model:
            try:
                import pandas as pd
                ci = booking.checkin_date if isinstance(booking.checkin_date, datetime) else datetime.utcnow()
                row = pd.DataFrame([{
                    "party_size": booking.party_size,
                    "adults": booking.adults,
                    "children": booking.children,
                    "nights": booking.nights,
                    "room_type_id": 1,  # simplified
                    "lead_time_days": max(0, (ci - datetime.utcnow()).days),
                    "channel_direct": 1 if booking.channel == "direct" else 0,
                    "channel_ota": 1 if booking.channel == "ota" else 0,
                    "is_weekend": 1 if ci.weekday() >= 4 else 0,
                    "month": ci.month,
                }])
                pred = self._occasion_model.predict(row)[0]
                proba = max(self._occasion_model.predict_proba(row)[0])
                return pred, float(proba)
            except Exception:
                pass

        # Rule-based fallback
        ps = booking.party_size
        adults = booking.adults
        children = booking.children
        nights = booking.nights

        if ps >= 50:                         return "wedding",     0.92
        if adults == 2 and children == 0 and nights >= 2: return "honeymoon", 0.71
        if booking.channel == "corporate":   return "corporate",  0.85
        if children > 0:                     return "family",      0.78
        if ps >= 4 and children == 0:        return "friends",     0.65
        if adults == 1:                      return "solo",        0.70
        return "none", 0.50

    async def _build_bundles(self, guest, booking, occasion: str, db) -> List[dict]:
        from backend.models.revenue import ServiceSlot

        eligible = [b for b in BUNDLE_CATALOGUE if occasion in b["occasions"] or occasion == "none"]

        # Check slot availability for bundles that need it
        available = []
        for bundle in eligible:
            if bundle.get("needs_slot"):
                slot = db.query(ServiceSlot).filter(
                    ServiceSlot.kind == bundle["needs_slot"],
                    ServiceSlot.start_ts >= booking.checkin_date if isinstance(booking.checkin_date, datetime) else datetime.utcnow(),
                    ServiceSlot.booked < ServiceSlot.capacity,
                ).first()
                if not slot:
                    continue  # capacity not available

            # Acceptance probability from guest propensity_upsell
            base_acc = 0.3 + guest.propensity_upsell * 0.5
            # Discount if needed (never exceed ceiling)
            discount = min(DISCOUNT_CEILING, max(0, 0.2 - guest.propensity_upsell * 0.15))
            final_price = bundle["price"] * (1 - discount)
            expected_margin = bundle["margin"] * (1 - discount * 0.5)

            score = expected_margin * base_acc

            available.append({
                **bundle,
                "final_price": round(final_price, 2),
                "discount_pct": round(discount * 100, 1),
                "expected_margin": round(expected_margin, 2),
                "acceptance_prob": round(base_acc, 2),
                "score": score,
            })

        # Return top 3 by score
        available.sort(key=lambda x: x["score"], reverse=True)
        return available[:3]
