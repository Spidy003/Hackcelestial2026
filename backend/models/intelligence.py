"""
Intelligence models: Feedback, Segment, Decision (DB record), Event (DB record), Alert.
Note: the in-memory Decision/Event objects in core/ are authoritative for runtime;
these DB models are for persistence and the API surface.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from backend.models import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source: Mapped[str] = mapped_column(
        String(16), default="app"
    )  # app|review|survey
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    text: Mapped[str] = mapped_column(Text, default="")
    # Derived
    sentiment: Mapped[str] = mapped_column(String(16), default="neutral")  # positive|neutral|negative
    aspects: Mapped[str] = mapped_column(Text, default="[]")           # JSON [{aspect, polarity}]
    root_cause_ref: Mapped[Optional[str]] = mapped_column(Text)

    def aspects_list(self) -> list:
        return json.loads(self.aspects)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "guest_id": self.guest_id,
            "ts": self.ts.isoformat(),
            "source": self.source,
            "rating": self.rating,
            "text": self.text,
            "sentiment": self.sentiment,
            "aspects": self.aspects_list(),
            "root_cause_ref": self.root_cause_ref,
        }


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    size: Mapped[int] = mapped_column(Integer, default=0)
    centroid: Mapped[str] = mapped_column(Text, default="[]")   # JSON float list
    traits: Mapped[str] = mapped_column(Text, default="{}")      # JSON dict
    revenue_share: Mapped[float] = mapped_column(Float, default=0.0)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    pca_x: Mapped[float] = mapped_column(Float, default=0.0)
    pca_y: Mapped[float] = mapped_column(Float, default=0.0)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "size": self.size,
            "centroid": json.loads(self.centroid),
            "traits": json.loads(self.traits),
            "revenue_share": round(self.revenue_share, 3),
            "generated_at": self.generated_at.isoformat(),
            "pca_x": round(self.pca_x, 4),
            "pca_y": round(self.pca_y, 4),
        }


class Event(Base):
    """Persisted event record (mirrors in-memory Event in bus.py)."""
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sim_ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[str] = mapped_column(Text, default="{}")    # JSON
    emitted_by: Mapped[str] = mapped_column(String(32), default="sim")
    cascade_id: Mapped[str] = mapped_column(String(36), nullable=False)
    parent_event_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ts": self.ts.isoformat(),
            "sim_ts": self.sim_ts.isoformat(),
            "type": self.type,
            "payload": json.loads(self.payload) if isinstance(self.payload, str) else self.payload,
            "emitted_by": self.emitted_by,
            "cascade_id": self.cascade_id,
            "parent_event_id": self.parent_event_id,
        }


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    severity: Mapped[str] = mapped_column(
        String(16), nullable=False
    )  # info|warn|critical
    agent: Mapped[str] = mapped_column(String(32), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_ref: Mapped[Optional[str]] = mapped_column(String(64))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ts": self.ts.isoformat(),
            "severity": self.severity,
            "agent": self.agent,
            "message": self.message,
            "entity_ref": self.entity_ref,
            "acknowledged": self.acknowledged,
        }
