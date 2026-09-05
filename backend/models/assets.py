"""
Asset & Maintenance models: Asset, Telemetry, Inspection.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # ac|geyser|elevator|pump|genset|kitchen_equip|pool_filter
    zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"), nullable=False)
    room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    install_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_service_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    service_interval_days: Mapped[int] = mapped_column(Integer, default=90)
    runtime_hours: Mapped[float] = mapped_column(Float, default=0.0)
    criticality: Mapped[int] = mapped_column(Integer, default=2)  # 1..3
    replacement_cost: Mapped[float] = mapped_column(Float, default=50000.0)
    # Derived
    health_score: Mapped[float] = mapped_column(Float, default=100.0)
    predicted_days_to_failure: Mapped[float] = mapped_column(Float, default=365.0)
    revenue_exposure: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_service_window: Mapped[Optional[str]] = mapped_column(Text)

    telemetry: Mapped[List["Telemetry"]] = relationship("Telemetry", back_populates="asset")
    inspections: Mapped[List["Inspection"]] = relationship("Inspection", back_populates="asset")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "kind": self.kind,
            "zone_id": self.zone_id,
            "room_id": self.room_id,
            "install_date": self.install_date.isoformat() if self.install_date else None,
            "last_service_date": self.last_service_date.isoformat() if self.last_service_date else None,
            "service_interval_days": self.service_interval_days,
            "runtime_hours": round(self.runtime_hours, 1),
            "criticality": self.criticality,
            "replacement_cost": self.replacement_cost,
            "health_score": round(self.health_score, 1),
            "predicted_days_to_failure": round(self.predicted_days_to_failure, 1),
            "revenue_exposure": round(self.revenue_exposure, 2),
            "recommended_service_window": self.recommended_service_window,
        }


class Telemetry(Base):
    __tablename__ = "telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    metric: Mapped[str] = mapped_column(String(32), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="telemetry")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "ts": self.ts.isoformat(),
            "metric": self.metric,
            "value": round(self.value, 3),
        }


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[Optional[int]] = mapped_column(ForeignKey("assets.id"), nullable=True)
    room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    staff_id: Mapped[Optional[int]] = mapped_column(ForeignKey("staff.id"), nullable=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Derived by inspection_severity ML model
    severity_label: Mapped[str] = mapped_column(String(16), default="none")  # none|minor|major|critical

    asset: Mapped[Optional["Asset"]] = relationship("Asset", back_populates="inspections")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "room_id": self.room_id,
            "staff_id": self.staff_id,
            "ts": self.ts.isoformat(),
            "note_text": self.note_text,
            "severity_label": self.severity_label,
        }
