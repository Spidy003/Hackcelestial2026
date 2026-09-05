"""
Resort & Space models: Zone, RoomType, Room.
Derived fields (workload_index, staff_on_duty, etc.) are Python properties
recomputed by the tick loop — they are NOT stored in the DB to avoid constant writes.
The in-memory state dict is the source of truth for derived fields.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # rooms|fnb|spa|banquet|frontdesk|grounds|kitchen|pool
    floor: Mapped[int] = mapped_column(Integer, default=0)
    capacity: Mapped[int] = mapped_column(Integer, default=10)
    staff_required_baseline: Mapped[int] = mapped_column(Integer, default=2)

    # Derived — stored as fast-access columns updated in-memory, flushed occasionally
    workload_index: Mapped[float] = mapped_column(Float, default=0.0)
    staff_on_duty: Mapped[int] = mapped_column(Integer, default=0)
    staff_required_now: Mapped[int] = mapped_column(Integer, default=0)
    backlog_count: Mapped[int] = mapped_column(Integer, default=0)
    clean_priority: Mapped[float] = mapped_column(Float, default=0.0)

    rooms: Mapped[List["Room"]] = relationship("Room", back_populates="zone")
    staff: Mapped[List["Staff"]] = relationship(
        "Staff", back_populates="current_zone", foreign_keys="Staff.current_zone_id"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "kind": self.kind,
            "floor": self.floor,
            "capacity": self.capacity,
            "staff_required_baseline": self.staff_required_baseline,
            "workload_index": round(self.workload_index, 1),
            "staff_on_duty": self.staff_on_duty,
            "staff_required_now": self.staff_required_now,
            "backlog_count": self.backlog_count,
        }


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    base_rate: Mapped[float] = mapped_column(Float, nullable=False)
    max_occupancy: Mapped[int] = mapped_column(Integer, default=2)
    amenities: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    count: Mapped[int] = mapped_column(Integer, default=0)

    rooms: Mapped[List["Room"]] = relationship("Room", back_populates="room_type")

    def amenities_list(self) -> list:
        return json.loads(self.amenities)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "base_rate": self.base_rate,
            "max_occupancy": self.max_occupancy,
            "amenities": self.amenities_list(),
            "count": self.count,
        }


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(8), nullable=False, unique=True)
    floor: Mapped[int] = mapped_column(Integer, default=1)
    zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"), nullable=False)
    type_id: Mapped[int] = mapped_column(ForeignKey("room_types.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="vacant_clean"
    )  # vacant_clean|vacant_dirty|occupied|ooo|maintenance
    view: Mapped[Optional[str]] = mapped_column(String(32))
    last_cleaned_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    current_booking_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("bookings.id"), nullable=True
    )
    # Derived
    clean_priority: Mapped[float] = mapped_column(Float, default=0.0)

    zone: Mapped["Zone"] = relationship("Zone", back_populates="rooms")
    room_type: Mapped["RoomType"] = relationship("RoomType", back_populates="rooms")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "number": self.number,
            "floor": self.floor,
            "zone_id": self.zone_id,
            "type_id": self.type_id,
            "status": self.status,
            "view": self.view,
            "last_cleaned_at": self.last_cleaned_at.isoformat() if self.last_cleaned_at else None,
            "current_booking_id": self.current_booking_id,
            "clean_priority": round(self.clean_priority, 2),
        }
