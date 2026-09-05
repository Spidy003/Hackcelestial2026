"""
Occupancy curves, arrival patterns, weather modifiers — all time-of-day
and date-driven weights used by the stochastic generators.
"""
from __future__ import annotations

import math
from datetime import datetime


# ------------------------------------------------------------------ #
# Hourly arrival intensity (0..1) — peaks 13:00–17:00
# ------------------------------------------------------------------ #
ARRIVAL_CURVE = {
    0: 0.00, 1: 0.00, 2: 0.00, 3: 0.00, 4: 0.00, 5: 0.00,
    6: 0.02, 7: 0.05, 8: 0.10, 9: 0.15, 10: 0.20, 11: 0.25,
    12: 0.35, 13: 0.65, 14: 0.90, 15: 1.00, 16: 0.85, 17: 0.60,
    18: 0.40, 19: 0.25, 20: 0.15, 21: 0.10, 22: 0.05, 23: 0.02,
}

# Departure peaks 09:00–11:00
DEPARTURE_CURVE = {
    0: 0.00, 1: 0.00, 2: 0.00, 3: 0.00, 4: 0.00, 5: 0.01,
    6: 0.05, 7: 0.20, 8: 0.50, 9: 1.00, 10: 0.95, 11: 0.70,
    12: 0.40, 13: 0.20, 14: 0.10, 15: 0.05, 16: 0.03, 17: 0.02,
    18: 0.02, 19: 0.01, 20: 0.01, 21: 0.00, 22: 0.00, 23: 0.00,
}

# Guest request rate by hour (relative; peaks at meal times + evening)
REQUEST_CURVE = {
    0: 0.05, 1: 0.03, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.05,
    6: 0.15, 7: 0.45, 8: 0.60, 9: 0.50, 10: 0.40, 11: 0.45,
    12: 0.70, 13: 0.85, 14: 0.65, 15: 0.55, 16: 0.60, 17: 0.70,
    18: 0.85, 19: 1.00, 20: 0.90, 21: 0.75, 22: 0.45, 23: 0.20,
}


def arrival_weight(sim_ts: datetime) -> float:
    """Base arrival weight at this sim time, including weekend surge."""
    base = ARRIVAL_CURVE[sim_ts.hour]
    weekend_mult = 1.35 if sim_ts.weekday() >= 5 else 1.0
    return base * weekend_mult


def departure_weight(sim_ts: datetime) -> float:
    return DEPARTURE_CURVE[sim_ts.hour]


def request_weight(sim_ts: datetime, occupancy_pct: float) -> float:
    """Request rate scales with occupancy."""
    base = REQUEST_CURVE[sim_ts.hour]
    return base * (0.3 + 0.7 * occupancy_pct)


def weather_modifier(weather: str) -> dict:
    """Returns rate multipliers per revenue category given weather."""
    if weather == "rain":
        return {
            "arrivals": 0.85,
            "outdoor_slots": 0.40,
            "indoor_slots": 1.30,
            "fnb": 1.15,
        }
    elif weather == "storm":
        return {
            "arrivals": 0.60,
            "outdoor_slots": 0.10,
            "indoor_slots": 1.50,
            "fnb": 1.30,
        }
    return {  # sunny
        "arrivals": 1.00,
        "outdoor_slots": 1.20,
        "indoor_slots": 0.90,
        "fnb": 1.00,
    }


def season_multiplier(sim_ts: datetime) -> float:
    """Coastal Alibaug season — peaks Dec–Feb and Oct–Nov."""
    month = sim_ts.month
    peak = {10: 1.15, 11: 1.20, 12: 1.30, 1: 1.25, 2: 1.20}
    shoulder = {3: 1.05, 9: 1.05}
    off = {4: 0.80, 5: 0.70, 6: 0.65, 7: 0.75, 8: 0.80}  # monsoon
    return peak.get(month, shoulder.get(month, off.get(month, 1.0)))


def fnb_covers_multiplier(sim_ts: datetime) -> float:
    """Meal-time cover multiplier."""
    h = sim_ts.hour
    if 7 <= h <= 9:    return 0.9   # breakfast
    if 12 <= h <= 14:  return 1.0   # lunch
    if 19 <= h <= 22:  return 1.1   # dinner
    return 0.1
