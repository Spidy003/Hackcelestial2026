"""
People models: Staff, Task.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # housekeeping|fnb|maintenance|frontdesk|spa|security|chef
    skills: Mapped[str] = mapped_column(Text, default="[]")      # JSON list
    languages: Mapped[str] = mapped_column(Text, default='["en"]')  # JSON list
    home_zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"), nullable=False)
    current_zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"), nullable=False)
    shift_start: Mapped[int] = mapped_column(Integer, default=8)   # hour 0-23
    shift_end: Mapped[int] = mapped_column(Integer, default=16)    # hour 0-23
    hours_this_week: Mapped[float] = mapped_column(Float, default=0.0)
    days_worked_streak: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(
        String(16), default="idle"
    )  # idle|busy|break|off
    current_task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    avg_task_minutes: Mapped[float] = mapped_column(Float, default=20.0)
    quality_rating: Mapped[float] = mapped_column(Float, default=4.0)
    # Derived
    fatigue_score: Mapped[float] = mapped_column(Float, default=0.0)
    utilisation_pct: Mapped[float] = mapped_column(Float, default=0.0)

    home_zone: Mapped["Zone"] = relationship("Zone", foreign_keys=[home_zone_id])
    current_zone: Mapped["Zone"] = relationship(
        "Zone", foreign_keys=[current_zone_id], back_populates="staff"
    )

    def skills_list(self) -> list:
        return json.loads(self.skills)

    def languages_list(self) -> list:
        return json.loads(self.languages)

    def is_on_shift(self, sim_hour: int) -> bool:
        if self.shift_start <= self.shift_end:
            return self.shift_start <= sim_hour < self.shift_end
        # Night shift wraps midnight
        return sim_hour >= self.shift_start or sim_hour < self.shift_end

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "skills": self.skills_list(),
            "languages": self.languages_list(),
            "home_zone_id": self.home_zone_id,
            "current_zone_id": self.current_zone_id,
            "shift_start": self.shift_start,
            "shift_end": self.shift_end,
            "hours_this_week": round(self.hours_this_week, 1),
            "days_worked_streak": self.days_worked_streak,
            "status": self.status,
            "current_task_id": self.current_task_id,
            "avg_task_minutes": round(self.avg_task_minutes, 1),
            "quality_rating": round(self.quality_rating, 2),
            "fatigue_score": round(self.fatigue_score, 1),
            "utilisation_pct": round(self.utilisation_pct, 1),
        }


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=2)  # 1..4
    source: Mapped[str] = mapped_column(
        String(32), default="agent"
    )  # concierge|inspection|agent|manual
    zone_id: Mapped[Optional[int]] = mapped_column(ForeignKey("zones.id"), nullable=True)
    room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    asset_id: Mapped[Optional[int]] = mapped_column(ForeignKey("assets.id"), nullable=True)
    guest_id: Mapped[Optional[int]] = mapped_column(ForeignKey("guests.id"), nullable=True)
    assigned_staff_id: Mapped[Optional[int]] = mapped_column(ForeignKey("staff.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sla_minutes: Mapped[int] = mapped_column(Integer, default=30)
    est_minutes: Mapped[int] = mapped_column(Integer, default=20)
    actual_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default="open"
    )  # open|assigned|in_progress|done|breached
    # Derived
    sla_remaining: Mapped[float] = mapped_column(Float, default=30.0)
    is_breaching: Mapped[bool] = mapped_column(Boolean, default=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "priority": self.priority,
            "source": self.source,
            "zone_id": self.zone_id,
            "room_id": self.room_id,
            "asset_id": self.asset_id,
            "guest_id": self.guest_id,
            "assigned_staff_id": self.assigned_staff_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "sla_minutes": self.sla_minutes,
            "est_minutes": self.est_minutes,
            "actual_minutes": self.actual_minutes,
            "status": self.status,
            "sla_remaining": round(self.sla_remaining, 1),
            "is_breaching": self.is_breaching,
        }
