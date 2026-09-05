"""
Guest & Booking models.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(16))
    language: Mapped[str] = mapped_column(String(8), default="en")  # en|hi|mr
    loyalty_tier: Mapped[str] = mapped_column(
        String(16), default="none"
    )  # none|silver|gold|platinum
    stays_count: Mapped[int] = mapped_column(Integer, default=0)
    lifetime_value: Mapped[float] = mapped_column(Float, default=0.0)
    avg_rating_given: Mapped[float] = mapped_column(Float, default=4.0)
    preferences: Mapped[str] = mapped_column(Text, default="{}")  # JSON dict
    # Derived
    segment_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gers_score: Mapped[float] = mapped_column(Float, default=0.0)
    gers_drivers: Mapped[str] = mapped_column(Text, default="[]")   # JSON list
    propensity_discount: Mapped[float] = mapped_column(Float, default=0.5)
    propensity_upsell: Mapped[float] = mapped_column(Float, default=0.5)

    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="guest")

    def prefs(self) -> dict:
        return json.loads(self.preferences)

    def gers_drivers_list(self) -> list:
        return json.loads(self.gers_drivers)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "language": self.language,
            "loyalty_tier": self.loyalty_tier,
            "stays_count": self.stays_count,
            "lifetime_value": round(self.lifetime_value, 2),
            "avg_rating_given": round(self.avg_rating_given, 2),
            "preferences": self.prefs(),
            "segment_id": self.segment_id,
            "gers_score": round(self.gers_score, 1),
            "gers_drivers": self.gers_drivers_list(),
            "propensity_discount": round(self.propensity_discount, 3),
            "propensity_upsell": round(self.propensity_upsell, 3),
        }


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False)
    room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    channel: Mapped[str] = mapped_column(
        String(16), default="direct"
    )  # direct|ota|walkin|corporate
    checkin_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    checkout_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    nights: Mapped[int] = mapped_column(Integer, default=1)
    adults: Mapped[int] = mapped_column(Integer, default=2)
    children: Mapped[int] = mapped_column(Integer, default=0)
    party_size: Mapped[int] = mapped_column(Integer, default=2)
    occasion: Mapped[str] = mapped_column(
        String(32), default="none"
    )  # none|wedding|honeymoon|corporate|family|friends|solo
    veg_count: Mapped[int] = mapped_column(Integer, default=0)
    nonveg_count: Mapped[int] = mapped_column(Integer, default=0)
    jain_count: Mapped[int] = mapped_column(Integer, default=0)
    rate_locked: Mapped[float] = mapped_column(Float, default=0.0)
    addons: Mapped[str] = mapped_column(Text, default="[]")     # JSON list
    status: Mapped[str] = mapped_column(
        String(16), default="confirmed"
    )  # confirmed|checked_in|checked_out|cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # Derived
    occasion_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_bundle: Mapped[str] = mapped_column(Text, default="[]")  # JSON

    guest: Mapped["Guest"] = relationship("Guest", back_populates="bookings")

    def addons_list(self) -> list:
        return json.loads(self.addons)

    def bundle(self) -> list:
        return json.loads(self.recommended_bundle)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "guest_id": self.guest_id,
            "room_id": self.room_id,
            "channel": self.channel,
            "checkin_date": self.checkin_date.isoformat() if self.checkin_date else None,
            "checkout_date": self.checkout_date.isoformat() if self.checkout_date else None,
            "nights": self.nights,
            "adults": self.adults,
            "children": self.children,
            "party_size": self.party_size,
            "occasion": self.occasion,
            "veg_count": self.veg_count,
            "nonveg_count": self.nonveg_count,
            "jain_count": self.jain_count,
            "rate_locked": round(self.rate_locked, 2),
            "addons": self.addons_list(),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "occasion_confidence": round(self.occasion_confidence, 3),
            "recommended_bundle": self.bundle(),
        }
