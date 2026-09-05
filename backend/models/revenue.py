"""
Revenue models: ServiceSlot, RateCalendar, Offer.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class ServiceSlot(Base):
    __tablename__ = "service_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # spa|activity|restaurant|cabana|bowling
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    start_ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    booked: Mapped[int] = mapped_column(Integer, default=0)
    base_price: Mapped[float] = mapped_column(Float, default=0.0)
    # Derived
    current_price: Mapped[float] = mapped_column(Float, default=0.0)
    fill_pct: Mapped[float] = mapped_column(Float, default=0.0)
    minutes_to_expiry: Mapped[float] = mapped_column(Float, default=999.0)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "name": self.name,
            "start_ts": self.start_ts.isoformat(),
            "capacity": self.capacity,
            "booked": self.booked,
            "base_price": round(self.base_price, 2),
            "current_price": round(self.current_price, 2),
            "fill_pct": round(self.fill_pct, 1),
            "minutes_to_expiry": round(self.minutes_to_expiry, 1),
        }


class RateCalendar(Base):
    __tablename__ = "rate_calendar"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    room_type_id: Mapped[int] = mapped_column(ForeignKey("room_types.id"), nullable=False)
    base_rate: Mapped[float] = mapped_column(Float, nullable=False)
    # Derived
    current_rate: Mapped[float] = mapped_column(Float, nullable=False)
    demand_index: Mapped[float] = mapped_column(Float, default=0.5)
    comp_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text)

    room_type: Mapped["RoomType"] = relationship("RoomType")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "date": self.date.isoformat(),
            "room_type_id": self.room_type_id,
            "base_rate": round(self.base_rate, 2),
            "current_rate": round(self.current_rate, 2),
            "demand_index": round(self.demand_index, 3),
            "comp_rate": round(self.comp_rate, 2) if self.comp_rate else None,
            "reason": self.reason,
        }


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False)
    slot_id: Mapped[Optional[int]] = mapped_column(ForeignKey("service_slots.id"), nullable=True)
    discount_pct: Mapped[float] = mapped_column(Float, default=0.0)
    bundle_description: Mapped[Optional[str]] = mapped_column(Text)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(
        String(16), default="pending"
    )  # pending|accepted|rejected|expired
    expected_margin: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "guest_id": self.guest_id,
            "slot_id": self.slot_id,
            "discount_pct": round(self.discount_pct, 2),
            "bundle_description": self.bundle_description,
            "valid_until": self.valid_until.isoformat() if self.valid_until else None,
            "status": self.status,
            "expected_margin": round(self.expected_margin, 2),
            "created_at": self.created_at.isoformat(),
        }
