"""
Stochastic event generators — called each tick by the SimClock.
Each generator decides (probabilistically) whether to emit one or more events
to the EventBus, based on current resort state and time-of-day profiles.
"""
from __future__ import annotations

import json
import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Dict, List, Optional

from backend.sim.profiles import (
    arrival_weight, departure_weight, request_weight,
    weather_modifier, season_multiplier, fnb_covers_multiplier,
)

if TYPE_CHECKING:
    from backend.core.bus import EventBus

logger = logging.getLogger(__name__)

# Request text templates by category
REQUEST_TEMPLATES = {
    "housekeeping": [
        "Please send extra towels to our room.",
        "Can we get our room cleaned please?",
        "We need fresh toiletries.",
        "Please send an extra pillow.",
        "Can someone pick up the laundry?",
    ],
    "fnb": [
        "Can we order room service breakfast?",
        "Please send up a pot of chai.",
        "We'd like dinner delivered to the room.",
        "Can someone bring the menu?",
        "We need water bottles please.",
    ],
    "maintenance": [
        "The AC is not cooling properly.",
        "Hot water in the shower is not working.",
        "The TV remote is not working.",
        "There's a leaking tap in the bathroom.",
        "The light in the bathroom is flickering.",
    ],
    "concierge": [
        "Can you arrange a taxi to Mandwa?",
        "We'd like to book the sunset boat tour.",
        "What activities are available this evening?",
        "Can you recommend a good Konkani restaurant?",
        "We need help with our luggage.",
    ],
}

INSPECTION_NOTES = {
    "none": [
        "Room clean and tidy, everything in order.",
        "No issues found during inspection.",
        "Room in excellent condition.",
    ],
    "minor": [
        "Small stain on the carpet near the window.",
        "Shower head has slight mineral deposits.",
        "Grout needs re-caulking around bathtub.",
        "AC filter needs cleaning.",
    ],
    "major": [
        "AC unit making loud rattling noise, not cooling well.",
        "Hot water pressure very low, geyser may need service.",
        "Mold visible in bathroom corner near shower.",
        "Toilet flush mechanism is faulty.",
    ],
    "critical": [
        "AC completely not working, room uninhabitable in this heat.",
        "No hot water at all, guest complained.",
        "Electrical socket sparking near bed — immediate safety concern.",
        "Water leak from ceiling, potential structural issue.",
    ],
}

FEEDBACK_POSITIVE = [
    "Had a wonderful stay, the staff were very attentive and the sea view was breathtaking.",
    "Excellent food at the restaurant, especially the Konkani thali.",
    "The pool area is beautiful and well maintained.",
    "Staff went above and beyond for our anniversary.",
    "Very clean rooms and comfortable beds.",
]

FEEDBACK_NEGATIVE = [
    "The AC in our room was not working properly the entire stay.",
    "Hot water was inconsistent, sometimes cold in the morning.",
    "Long wait times at the restaurant for dinner.",
    "Room service was very slow, took over an hour.",
    "Wifi connectivity was poor in the garden-view rooms.",
]


class ResortGenerators:
    """
    Holds all state needed by the generators (reference to the EventBus and
    current resort state snapshot updated by the clock).
    """

    def __init__(self, bus: "EventBus") -> None:
        self.bus = bus
        # Mutable state snapshot — updated by the main app each tick
        self.state: Dict = {
            "occupancy_pct": 0.60,
            "in_house_guests": [],      # list of {guest_id, room_id, booking_id}
            "vacant_dirty_rooms": [],   # list of room_ids
            "upcoming_checkouts": [],   # list of booking_ids due today
            "weather": "sunny",
            "assets": [],               # list of {asset_id, kind, health_score, degrading}
            "inventory_items": [],      # [{item_id, on_hand, par_level}]
        }
        self._tick_count = 0

    def update_state(self, state_snapshot: dict) -> None:
        self.state.update(state_snapshot)

    async def tick(self, sim_ts: datetime, tick_count: int) -> None:
        """Called every tick. Each sub-generator fires independently."""
        self._tick_count = tick_count
        await self._gen_arrivals(sim_ts)
        await self._gen_departures(sim_ts)
        await self._gen_requests(sim_ts)
        await self._gen_telemetry(sim_ts)
        await self._gen_consumption(sim_ts)
        await self._gen_inspections(sim_ts)
        await self._gen_feedback(sim_ts)
        await self._gen_weather(sim_ts, tick_count)

    # ------------------------------------------------------------------ #
    # Individual generators
    # ------------------------------------------------------------------ #

    async def _gen_arrivals(self, sim_ts: datetime) -> None:
        """Probabilistic check-in generation."""
        weight = arrival_weight(sim_ts) * season_multiplier(sim_ts)
        # ~3 arrivals/hour at peak → 0.25/5-min tick at weight=1
        rate = weight * 0.25
        if random.random() < rate:
            # Pick a 'waiting' booking or create a walk-in
            guest_id = random.randint(1, 300)
            room_id = random.randint(1, 84)
            cascade_id = str(uuid.uuid4())
            await self.bus.publish(
                "booking.created",
                payload={
                    "guest_id": guest_id,
                    "room_id": room_id,
                    "channel": random.choice(["direct", "ota", "walkin"]),
                    "nights": random.randint(1, 4),
                    "adults": random.randint(1, 3),
                    "children": random.randint(0, 2),
                    "party_size": random.randint(1, 4),
                    "occasion": "none",
                },
                emitted_by="sim.arrivals",
                cascade_id=cascade_id,
                sim_ts=sim_ts,
            )
            await self.bus.publish(
                "guest.checked_in",
                payload={"guest_id": guest_id, "room_id": room_id},
                emitted_by="sim.arrivals",
                cascade_id=cascade_id,
                sim_ts=sim_ts,
            )

    async def _gen_departures(self, sim_ts: datetime) -> None:
        weight = departure_weight(sim_ts)
        rate = weight * 0.20
        if random.random() < rate and self.state.get("in_house_guests"):
            guest = random.choice(self.state["in_house_guests"])
            cascade_id = str(uuid.uuid4())
            await self.bus.publish(
                "guest.checked_out",
                payload={
                    "guest_id": guest["guest_id"],
                    "room_id": guest["room_id"],
                    "booking_id": guest.get("booking_id"),
                },
                emitted_by="sim.departures",
                cascade_id=cascade_id,
                sim_ts=sim_ts,
            )

    async def _gen_requests(self, sim_ts: datetime) -> None:
        occ = self.state.get("occupancy_pct", 0.6)
        weight = request_weight(sim_ts, occ)
        # ~8 requests/hour at full occ → ~0.67/5-min tick
        rate = weight * 0.67
        n = sum(1 for _ in range(3) if random.random() < rate / 3)
        for _ in range(n):
            category = random.choice(list(REQUEST_TEMPLATES.keys()))
            text = random.choice(REQUEST_TEMPLATES[category])
            guests = self.state.get("in_house_guests", [])
            guest_id = random.choice(guests)["guest_id"] if guests else random.randint(1, 84)
            await self.bus.publish(
                "guest.request",
                payload={
                    "guest_id": guest_id,
                    "category": category,
                    "text": text,
                    "priority": 2 if category in ("maintenance",) else 3,
                },
                emitted_by="sim.requests",
                sim_ts=sim_ts,
            )

    async def _gen_telemetry(self, sim_ts: datetime) -> None:
        """Each asset emits a reading; degrading assets drift toward anomaly."""
        for asset_info in self.state.get("assets", []):
            asset_id = asset_info["asset_id"]
            kind = asset_info["kind"]
            degrading = asset_info.get("degrading", False)
            health = asset_info.get("health_score", 100.0)

            # Generate metric value
            if kind == "ac":
                # Normal: cooling_temp ~19°C, power_draw ~1.2kW
                base_temp = 19.0 + (100 - health) * 0.08 + random.gauss(0, 0.3)
                base_power = 1.2 + (100 - health) * 0.005 + random.gauss(0, 0.05)
                if degrading:
                    base_temp += random.uniform(0.1, 0.5)
                    base_power += random.uniform(0.05, 0.15)
                await self.bus.publish(
                    "asset.reading",
                    payload={"asset_id": asset_id, "metric": "cooling_temp", "value": round(base_temp, 2)},
                    emitted_by="sim.telemetry",
                    sim_ts=sim_ts,
                )
                await self.bus.publish(
                    "asset.reading",
                    payload={"asset_id": asset_id, "metric": "power_draw_kw", "value": round(base_power, 3)},
                    emitted_by="sim.telemetry",
                    sim_ts=sim_ts,
                )
            elif kind == "geyser":
                outlet_temp = 48.0 - (100 - health) * 0.25 + random.gauss(0, 1.0)
                if degrading:
                    outlet_temp -= random.uniform(0.5, 2.0)
                await self.bus.publish(
                    "asset.reading",
                    payload={"asset_id": asset_id, "metric": "outlet_temp_c", "value": round(outlet_temp, 2)},
                    emitted_by="sim.telemetry",
                    sim_ts=sim_ts,
                )
            elif kind == "pump":
                pressure = 3.5 - (100 - health) * 0.02 + random.gauss(0, 0.1)
                await self.bus.publish(
                    "asset.reading",
                    payload={"asset_id": asset_id, "metric": "pressure_bar", "value": round(pressure, 3)},
                    emitted_by="sim.telemetry",
                    sim_ts=sim_ts,
                )

    async def _gen_consumption(self, sim_ts: datetime) -> None:
        """Food and housekeeping consumption driven by occupancy + meal times."""
        occ = self.state.get("occupancy_pct", 0.6)
        occupied_rooms = int(occ * 84)
        covers_mult = fnb_covers_multiplier(sim_ts)

        # Only fire at meal times or when there's meaningful consumption
        if covers_mult < 0.15 and random.random() > 0.1:
            return

        # Sample a few inventory items
        items = self.state.get("inventory_items", [])
        sample = random.sample(items, min(5, len(items))) if items else []
        for item in sample:
            item_id = item["item_id"]
            category = item.get("category", "housekeeping")
            if category == "food":
                # qty driven by covers
                qty = covers_mult * occupied_rooms * 0.02 * random.uniform(0.8, 1.2)
                driver = "covers"
            else:
                qty = occupied_rooms * 0.005 * random.uniform(0.9, 1.1)
                driver = "room_nights"

            if qty > 0.01:
                # Add 3-8% waste noise
                waste_factor = 1.0 + random.uniform(0.03, 0.08)
                await self.bus.publish(
                    "inventory.consumed",
                    payload={
                        "item_id": item_id,
                        "qty": round(qty * waste_factor, 3),
                        "driver": driver,
                        "waste_qty": round(qty * (waste_factor - 1.0), 3),
                    },
                    emitted_by="sim.consumption",
                    sim_ts=sim_ts,
                )

    async def _gen_inspections(self, sim_ts: datetime) -> None:
        """Housekeeping files inspection notes on cleaned rooms (mid-morning)."""
        if not (9 <= sim_ts.hour <= 13):
            return
        if random.random() > 0.15:
            return
        # Severity weighted toward 'none' (most rooms are fine)
        severity = random.choices(
            ["none", "minor", "major", "critical"],
            weights=[0.70, 0.20, 0.08, 0.02],
        )[0]
        note = random.choice(INSPECTION_NOTES[severity])
        room_id = random.randint(1, 84)
        asset_id = None
        if severity in ("major", "critical"):
            # Attach to an asset in that room
            assets = [a for a in self.state.get("assets", []) if a.get("room_id") == room_id]
            if assets:
                asset_id = random.choice(assets)["asset_id"]
        await self.bus.publish(
            "inspection.filed",
            payload={
                "room_id": room_id,
                "asset_id": asset_id,
                "note_text": note,
                "severity_hint": severity,
                "staff_id": random.randint(1, 42),
            },
            emitted_by="sim.inspections",
            sim_ts=sim_ts,
        )

    async def _gen_feedback(self, sim_ts: datetime) -> None:
        """Guests submit feedback, mostly at checkout time."""
        if not (9 <= sim_ts.hour <= 12) and not (21 <= sim_ts.hour <= 23):
            return
        if random.random() > 0.08:
            return
        # Feedback correlates with occupancy — more guests, more reviews
        is_positive = random.random() < 0.72  # ~72% positive baseline
        text = random.choice(FEEDBACK_POSITIVE if is_positive else FEEDBACK_NEGATIVE)
        rating = random.uniform(4.0, 5.0) if is_positive else random.uniform(1.5, 3.5)
        guests = self.state.get("in_house_guests", [])
        guest_id = random.choice(guests)["guest_id"] if guests else random.randint(1, 300)
        await self.bus.publish(
            "feedback.submitted",
            payload={
                "guest_id": guest_id,
                "rating": round(rating, 1),
                "text": text,
                "source": random.choice(["app", "review", "survey"]),
            },
            emitted_by="sim.feedback",
            sim_ts=sim_ts,
        )

    async def _gen_weather(self, sim_ts: datetime, tick_count: int) -> None:
        """Weather changes every ~60 sim-minutes (12 ticks at 5 min/tick)."""
        if tick_count % 12 != 0:
            return
        current = self.state.get("weather", "sunny")
        # Monsoon months: higher rain probability
        rain_prob = 0.45 if sim_ts.month in (6, 7, 8) else 0.15
        weights = {"sunny": 1.0 - rain_prob, "rain": rain_prob * 0.8, "storm": rain_prob * 0.2}
        new_weather = random.choices(
            list(weights.keys()),
            weights=list(weights.values()),
        )[0]
        if new_weather != current:
            self.state["weather"] = new_weather
            await self.bus.publish(
                "weather.forecast_changed",
                payload={"from": current, "to": new_weather, "rain_prob": rain_prob},
                emitted_by="sim.weather",
                sim_ts=sim_ts,
            )
