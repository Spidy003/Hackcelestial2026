"""
Inventory models: InventoryItem, Batch, ConsumptionLog, MenuItem, Recipe, PurchaseOrder.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # food|housekeeping|maintenance|spa|bar
    unit: Mapped[str] = mapped_column(String(16), default="unit")
    on_hand: Mapped[float] = mapped_column(Float, default=0.0)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)
    supplier: Mapped[str] = mapped_column(String(64), default="")
    lead_time_days: Mapped[int] = mapped_column(Integer, default=2)
    shelf_life_days: Mapped[int] = mapped_column(Integer, default=30)
    # Derived
    par_level: Mapped[float] = mapped_column(Float, default=0.0)
    reorder_point: Mapped[float] = mapped_column(Float, default=0.0)
    forecast_7d: Mapped[float] = mapped_column(Float, default=0.0)
    days_of_cover: Mapped[float] = mapped_column(Float, default=0.0)
    shortfall_qty: Mapped[float] = mapped_column(Float, default=0.0)
    expiring_soon_qty: Mapped[float] = mapped_column(Float, default=0.0)

    batches: Mapped[List["Batch"]] = relationship("Batch", back_populates="item")
    consumption_logs: Mapped[List["ConsumptionLog"]] = relationship("ConsumptionLog", back_populates="item")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "sku": self.sku,
            "name": self.name,
            "category": self.category,
            "unit": self.unit,
            "on_hand": round(self.on_hand, 2),
            "unit_cost": round(self.unit_cost, 2),
            "supplier": self.supplier,
            "lead_time_days": self.lead_time_days,
            "shelf_life_days": self.shelf_life_days,
            "par_level": round(self.par_level, 2),
            "reorder_point": round(self.reorder_point, 2),
            "forecast_7d": round(self.forecast_7d, 2),
            "days_of_cover": round(self.days_of_cover, 2),
            "shortfall_qty": round(self.shortfall_qty, 2),
            "expiring_soon_qty": round(self.expiring_soon_qty, 2),
        }


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), nullable=False)
    qty: Mapped[float] = mapped_column(Float, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="batches")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "item_id": self.item_id,
            "qty": round(self.qty, 2),
            "received_at": self.received_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    qty: Mapped[float] = mapped_column(Float, nullable=False)
    driver: Mapped[str] = mapped_column(
        String(32), default="room_nights"
    )  # covers|room_nights|task|waste

    item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="consumption_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "item_id": self.item_id,
            "ts": self.ts.isoformat(),
            "qty": round(self.qty, 3),
            "driver": self.driver,
        }


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    is_veg: Mapped[bool] = mapped_column(Boolean, default=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    station: Mapped[str] = mapped_column(String(32), default="main")
    popularity_weight: Mapped[float] = mapped_column(Float, default=1.0)

    recipes: Mapped[List["Recipe"]] = relationship("Recipe", back_populates="menu_item")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "is_veg": self.is_veg,
            "price": self.price,
            "station": self.station,
            "popularity_weight": round(self.popularity_weight, 2),
        }


class Recipe(Base):
    """Bill of materials: how much of each inventory SKU one cover of this dish uses."""
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"), nullable=False)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), nullable=False)
    qty_per_cover: Mapped[float] = mapped_column(Float, nullable=False)

    menu_item: Mapped["MenuItem"] = relationship("MenuItem", back_populates="recipes")
    inventory_item: Mapped["InventoryItem"] = relationship("InventoryItem")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier: Mapped[str] = mapped_column(String(64), nullable=False)
    lines: Mapped[str] = mapped_column(Text, default="[]")   # JSON [{item_id, qty, unit_cost}]
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(
        String(16), default="draft"
    )  # draft|approved|received
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by_agent: Mapped[str] = mapped_column(String(32), default="inventory")
    expected_delivery: Mapped[Optional[datetime]] = mapped_column(DateTime)

    def lines_list(self) -> list:
        return json.loads(self.lines)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "supplier": self.supplier,
            "lines": self.lines_list(),
            "total_cost": round(self.total_cost, 2),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "created_by_agent": self.created_by_agent,
            "expected_delivery": self.expected_delivery.isoformat() if self.expected_delivery else None,
        }
