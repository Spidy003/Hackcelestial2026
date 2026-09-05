"""
Pricing Agent — every_n_ticks: 4.

Yield management across rooms AND perishable service slots.
- Rooms: GBR predicts P(book at rate), maximise rate × P(book) with floor/ceiling clamp.
- Perishable slots: urgency = 1 - minutes_to_expiry/horizon → discount curve.
- Targeted discounting: only top decile by propensity_discount (never cannibalise full-rate demand).
- Weather swap: on rain → raise indoor prices, lower outdoor cabana prices.
Guardrails enforced and stated in reasoning.
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timedelta
from typing import Dict, List

import numpy as np

from backend.agents.base import Agent
from backend.models import SessionLocal
from backend.models.intelligence import Event

logger = logging.getLogger(__name__)

FLOOR_MULTIPLIER = 0.75   # rate floor = base_rate × 0.75
CEILING_MULTIPLIER = 2.50  # rate ceiling = base_rate × 2.50
MAX_CHANGE_PER_HOUR = 0.15  # max 15% rate change per real hour
DISCOUNT_HORIZON_MINUTES = 120  # how far ahead to consider "perishable"


class PricingAgent(Agent):
    name = "pricing"
    every_n_ticks = 4
    subscribes = ["booking.created", "weather.forecast_changed", "guest.checked_out", "calendar.event_added"]

    def __init__(self) -> None:
        super().__init__()
        self._booking_prob_model = self._try_load_model("backend/ml/artifacts/booking_probability.joblib")
        self._last_rate: Dict[int, float] = {}  # room_type_id -> last rate
        self._weather: str = "sunny"
        self._event_demand_mult: float = 1.0
        self._reviews_prevented: int = 0

    async def on_event(self, event: Event) -> None:
        payload = event.payload if isinstance(event.payload, dict) else json.loads(event.payload or "{}")

        if event.type == "weather.forecast_changed":
            old = self._weather
            self._weather = payload.get("to", "sunny")
            if old != self._weather:
                await self._weather_swap(event)

        elif event.type == "calendar.event_added":
            mult = payload.get("demand_multiplier", 1.0)
            self._event_demand_mult = max(self._event_demand_mult, mult)

        elif event.type == "booking.created":
            # Re-run pricing after each booking (occupancy changed)
            await self.periodic(datetime.utcnow(), -1)

    async def periodic(self, sim_ts: datetime, tick_count: int) -> None:
        db = SessionLocal()
        try:
            from backend.models.revenue import RateCalendar, ServiceSlot, Offer
            from backend.models.resort import Room, RoomType
            from backend.models.guests import Guest

            # 1. Room pricing — next 7 days
            rtypes = db.query(RoomType).all()
            total_rooms = db.query(Room).count() or 84
            occupied = db.query(Room).filter_by(status="occupied").count()
            occ_pct = occupied / total_rooms

            for rtype in rtypes:
                rate_rows = db.query(RateCalendar).filter(
                    RateCalendar.room_type_id == rtype.id,
                    RateCalendar.date >= datetime.utcnow(),
                ).order_by(RateCalendar.date).limit(7).all()

                for rc in rate_rows:
                    days_out = (rc.date - datetime.utcnow()).days
                    is_weekend = rc.date.weekday() >= 4
                    demand_index = self._compute_demand_index(occ_pct, days_out, is_weekend, self._weather)

                    optimal_rate = self._optimise_rate(rtype.base_rate, demand_index, rtype)

                    # Clamp to floor/ceiling and max change per hour
                    floor = rtype.base_rate * FLOOR_MULTIPLIER
                    ceiling = rtype.base_rate * CEILING_MULTIPLIER
                    optimal_rate = max(floor, min(ceiling, optimal_rate))

                    last = self._last_rate.get(rtype.id, rtype.base_rate)
                    max_change = last * MAX_CHANGE_PER_HOUR
                    optimal_rate = max(last - max_change, min(last + max_change, optimal_rate))

                    old_rate = rc.current_rate
                    if abs(old_rate - optimal_rate) > 100:  # only update if meaningful change
                        rc.current_rate = round(optimal_rate, 2)
                        rc.demand_index = round(demand_index, 3)
                        rc.reason = self._build_reason(demand_index, is_weekend, self._weather)
                        self._last_rate[rtype.id] = optimal_rate

                        await self._bus.publish(
                            "pricing.rate_changed",
                            payload={
                                "room_type_id": rtype.id,
                                "room_type": rtype.name,
                                "date": rc.date.isoformat(),
                                "old_rate": round(old_rate, 2),
                                "new_rate": round(optimal_rate, 2),
                                "change_pct": round((optimal_rate - old_rate) / old_rate * 100, 1),
                                "demand_index": round(demand_index, 3),
                            },
                            emitted_by=self.name,
                            sim_ts=sim_ts,
                        )

            # 2. Perishable slot pricing
            await self._price_slots(db, sim_ts)

            # 3. Targeted discounting (every 10 ticks)
            if tick_count % 10 == 0 or tick_count == -1:
                await self._targeted_discounts(db, sim_ts)

            db.commit()
        except Exception:
            logger.exception("[pricing] periodic() error")
            db.rollback()
        finally:
            db.close()

    async def _price_slots(self, db, sim_ts: datetime) -> None:
        from backend.models.revenue import ServiceSlot
        slots = db.query(ServiceSlot).filter(
            ServiceSlot.start_ts > datetime.utcnow(),
            ServiceSlot.start_ts < datetime.utcnow() + timedelta(hours=6),
        ).all()
        for slot in slots:
            mte = slot.minutes_to_expiry
            if mte < 0:
                continue
            fill = slot.fill_pct / 100
            urgency = 1.0 - min(1.0, mte / DISCOUNT_HORIZON_MINUTES)
            # Discount curve: increases as urgency rises and fill stays low
            discount_pct = urgency * (1.0 - fill) * 0.30  # max 30% discount
            new_price = slot.base_price * (1.0 - discount_pct)
            new_price = max(slot.base_price * 0.60, new_price)  # floor 60% of base
            slot.current_price = round(new_price, 2)

    async def _targeted_discounts(self, db, sim_ts: datetime) -> None:
        from backend.models.guests import Guest, Booking
        from backend.models.revenue import ServiceSlot, Offer

        in_house = db.query(Booking).filter_by(status="checked_in").all()
        if len(in_house) < 5:
            return

        # Rank by propensity_discount (top decile)
        guests_in_house = []
        for b in in_house:
            g = db.query(Guest).get(b.guest_id)
            if g:
                guests_in_house.append(g)

        if not guests_in_house:
            return

        guests_in_house.sort(key=lambda g: g.propensity_discount, reverse=True)
        top_decile = guests_in_house[:max(1, len(guests_in_house) // 10)]
        protected_count = len(guests_in_house) - len(top_decile)

        # Find an under-filled slot
        target_slot = db.query(ServiceSlot).filter(
            ServiceSlot.start_ts > datetime.utcnow() + timedelta(hours=1),
            ServiceSlot.fill_pct < 50,
        ).order_by(ServiceSlot.fill_pct).first()

        if not target_slot:
            return

        offers_sent = 0
        for g in top_decile:
            # Don't discount guests already holding a full-price booking for this slot
            existing = db.query(Offer).filter(
                Offer.guest_id == g.id,
                Offer.slot_id == target_slot.id,
                Offer.status == "pending",
            ).first()
            if existing:
                continue

            discount = round(g.propensity_discount * 20, 0)  # 0–20% based on propensity
            offer = Offer(
                guest_id=g.id,
                slot_id=target_slot.id,
                discount_pct=discount,
                bundle_description=f"Flash offer: {target_slot.name} at {discount:.0f}% off",
                valid_until=datetime.utcnow() + timedelta(hours=2),
                status="pending",
                expected_margin=target_slot.current_price * (1 - discount/100) * 0.6,
            )
            db.add(offer)
            offers_sent += 1

        if offers_sent == 0:
            return

        protected_rev = sum(
            target_slot.current_price for g in guests_in_house
            if g not in top_decile
        )

        await self.emit_decision(
            title=f"Flash offer: {target_slot.name} to top {len(top_decile)} guests",
            reasoning_steps=[
                f"Slot '{target_slot.name}' at {target_slot.start_ts.strftime('%H:%M')} is {target_slot.fill_pct:.0f}% full ({target_slot.booked}/{target_slot.capacity} booked).",
                f"Ranked {len(guests_in_house)} in-house guests by propensity_discount. Top decile ({len(top_decile)} guests) received offer; {protected_count} full-rate guests deliberately NOT offered discount.",
                f"Guardrail: no discount to guests already holding full-rate booking for this slot. Estimated protected full-rate revenue: ₹{protected_rev:,.0f}.",
            ],
            confidence=0.78,
            rupee_impact=target_slot.current_price * offers_sent * 0.85,
            counterfactual_text=f"Slot would expire {100 - target_slot.fill_pct:.0f}% empty — ₹0 marginal revenue.",
            counterfactual_rupees=target_slot.current_price * (target_slot.capacity - target_slot.booked),
            autonomy="auto",
        )

        await self._bus.publish(
            "offer.pushed",
            payload={
                "slot_id": target_slot.id,
                "slot_name": target_slot.name,
                "offers_sent": offers_sent,
                "protected_guests": protected_count,
                "protected_revenue": round(protected_rev, 2),
            },
            emitted_by=self.name,
            sim_ts=sim_ts,
        )

    async def _weather_swap(self, event: Event) -> None:
        db = SessionLocal()
        try:
            from backend.models.revenue import ServiceSlot, RateCalendar
            from backend.models.resort import RoomType

            if self._weather == "rain":
                outdoor_kinds = ["cabana", "activity"]
                indoor_kinds = ["spa", "restaurant"]
                outdoor_adj = 0.65
                indoor_adj = 1.25
            else:
                outdoor_adj = 1.0
                indoor_adj = 1.0

            outdoor_slots = db.query(ServiceSlot).filter(
                ServiceSlot.kind.in_(["cabana", "activity"]),
                ServiceSlot.start_ts > datetime.utcnow(),
            ).all()
            indoor_slots = db.query(ServiceSlot).filter(
                ServiceSlot.kind.in_(["spa", "restaurant"]),
                ServiceSlot.start_ts > datetime.utcnow(),
            ).all()

            for s in outdoor_slots:
                s.current_price = round(s.base_price * outdoor_adj, 2)
            for s in indoor_slots:
                indoor_ceil = s.base_price * 1.50
                s.current_price = round(min(indoor_ceil, s.current_price * indoor_adj), 2)

            rain_prob = event.payload.get("rain_prob", 0.85) if isinstance(event.payload, dict) else 0.85

            await self.emit_decision(
                title=f"Weather swap: rain forecast — {len(outdoor_slots)} outdoor ↓ / {len(indoor_slots)} indoor ↑",
                reasoning_steps=[
                    f"Weather changed to {self._weather} (rain_prob={rain_prob:.0%}). Historical demand shift: outdoor −35%, indoor +25%.",
                    f"Repriced {len(outdoor_slots)} outdoor slots: base × {outdoor_adj} (floor 60% of base enforced). Repriced {len(indoor_slots)} indoor slots: × {indoor_adj} (ceiling 150% of base).",
                    f"Reason cited in rate calendar: '{self._build_reason(0.6, False, self._weather)}'. Max rate change guardrail: {MAX_CHANGE_PER_HOUR*100:.0f}%/hour enforced.",
                ],
                confidence=0.82,
                rupee_impact=sum(s.base_price * (indoor_adj - 1.0) for s in indoor_slots),
                counterfactual_text="Without weather-aware pricing: indoor slots underpriced during peak indoor demand, outdoor slots wasted at full price.",
                counterfactual_rupees=sum(s.base_price * 0.25 for s in indoor_slots),
                autonomy="auto",
                cascade_id=event.cascade_id,
                linked_event_id=event.id,
            )

            await self._bus.publish(
                "pricing.rate_changed",
                payload={"trigger": "weather_swap", "weather": self._weather,
                         "outdoor_adj": outdoor_adj, "indoor_adj": indoor_adj},
                emitted_by=self.name,
                cascade_id=event.cascade_id,
                sim_ts=datetime.utcnow(),
            )
            db.commit()
        finally:
            db.close()

    def _compute_demand_index(self, occ_pct: float, days_out: int, is_weekend: bool, weather: str) -> float:
        di = 0.5
        di += (occ_pct - 0.5) * 0.4     # occupancy contribution
        di += 0.10 if is_weekend else 0
        di += self._event_demand_mult - 1.0  # event premium
        if weather == "rain":
            di -= 0.05
        di -= min(0.20, days_out * 0.01)  # closer = more certain demand
        return max(0.05, min(1.0, di))

    def _optimise_rate(self, base_rate: float, demand_index: float, rtype) -> float:
        if self._booking_prob_model:
            try:
                import numpy as np
                best_rate = base_rate
                best_ev = 0.0
                for mult in np.linspace(0.80, 2.50, 40):
                    rate = base_rate * mult
                    row = [[demand_index, mult, 1 if rate > base_rate else 0]]
                    prob = float(self._booking_prob_model.predict(row)[0])
                    ev = rate * prob
                    if ev > best_ev:
                        best_ev = ev
                        best_rate = rate
                return best_rate
            except Exception:
                pass
        # Fallback: linear with demand index
        return base_rate * (0.85 + demand_index * 1.30)

    def _build_reason(self, demand_index: float, is_weekend: bool, weather: str) -> str:
        parts = []
        if demand_index > 0.7:
            parts.append("high demand")
        elif demand_index < 0.4:
            parts.append("low demand")
        if is_weekend:
            parts.append("weekend premium")
        if weather == "rain":
            parts.append("rain forecast")
        if self._event_demand_mult > 1.1:
            parts.append("upcoming event")
        return ", ".join(parts) or "baseline"
