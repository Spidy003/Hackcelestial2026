"""
Agent ABC — base class for all 8 resort agents.
Each agent:
  - subscribes to a list of event types on the bus
  - runs a periodic() method every every_n_ticks
  - emits structured Decisions to the ledger
  - degrades gracefully when its ML model file is missing
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from backend.core.bus import EventBus, bus as default_bus
from backend.core.ledger import Decision, DecisionLedger, ledger as default_ledger
from backend.models.intelligence import Event

logger = logging.getLogger(__name__)


class Agent(ABC):
    name: str = "unnamed"
    every_n_ticks: int = 10
    subscribes: List[str] = []

    def __init__(
        self,
        bus: EventBus = None,
        ledger: DecisionLedger = None,
    ) -> None:
        self._bus = bus or default_bus
        self._ledger = ledger or default_ledger
        self._decision_count = 0
        self._last_decision_ts: Optional[datetime] = None
        self._last_decision_title: str = ""
        self._last_confidence: float = 0.0
        self._running: bool = False
        self._model_loaded: bool = False

        # Register event handlers
        for event_type in self.subscribes:
            self._bus.subscribe(event_type, self._handle_event)

        # Register global operational real-time coordination handlers for all agents
        self._bus.subscribe("operation.dispatched", self._handle_operation_dispatched)
        self._bus.subscribe("decision.approved", self._handle_decision_approved)
        self._bus.subscribe("inventory.restocked", self._handle_inventory_restocked)

        logger.info("Agent '%s' registered. subscribes=%s every_n=%d",
                    self.name, self.subscribes, self.every_n_ticks)

    # ------------------------------------------------------------------ #
    # Internal dispatcher
    # ------------------------------------------------------------------ #

    async def _handle_event(self, event: Event) -> None:
        self._running = True
        try:
            await self.on_event(event)
        except Exception:
            logger.exception("[%s] on_event(%s) failed", self.name, event.type)
        finally:
            self._running = False

    async def _handle_operation_dispatched(self, event: Event) -> None:
        payload = event.payload or {}
        action_name = payload.get("action_name", "Operational Dispatch")
        dept = str(payload.get("department", "")).lower()
        target_zone = str(payload.get("target_zone", "")).lower()
        risk_red = payload.get("risk_reduction", "")

        # Check if this agent is related to the department or zone or operation
        agent_key = self.name.lower().replace("_", "")
        dept_clean = dept.replace("&", "").replace("-", "").replace(" ", "")
        
        is_direct = (
            agent_key in dept_clean or
            dept_clean in agent_key or
            ("maintenance" in agent_key and ("pump" in action_name.lower() or "repair" in action_name.lower() or "service" in action_name.lower() or "filter" in action_name.lower() or "pool" in target_zone)) or
            ("staffing" in agent_key and ("staff" in action_name.lower() or "reallocation" in action_name.lower() or "shift" in action_name.lower() or "personnel" in action_name.lower())) or
            ("inventory" in agent_key and ("restock" in action_name.lower() or "procurement" in action_name.lower() or "linen" in action_name.lower() or "order" in action_name.lower())) or
            ("concierge" in agent_key and ("turn-down" in action_name.lower() or "guest" in action_name.lower() or "transfer" in action_name.lower() or "dining" in action_name.lower() or "villa" in target_zone)) or
            ("pricing" in agent_key and ("rate" in action_name.lower() or "pricing" in action_name.lower() or "occupancy" in action_name.lower())) or
            ("sentiment" in agent_key and ("review" in action_name.lower() or "satisfaction" in action_name.lower() or "wait" in action_name.lower()))
        )

        if is_direct:
            self._decision_count += 1
            self._last_decision_title = f"{action_name} [{risk_red}]" if risk_red else action_name
            self._last_confidence = 0.98
            self._last_decision_ts = datetime.utcnow()
            logger.info("[%s] Real-time operation processed: %s", self.name, action_name)
        else:
            # Coordinated situational awareness across all other agents
            self._last_decision_title = f"Synced with {dept.title() or 'Ops'}: {action_name[:36]}"
            self._last_decision_ts = datetime.utcnow()

    async def _handle_decision_approved(self, event: Event) -> None:
        payload = event.payload or {}
        title = payload.get("title", "")
        agent = payload.get("agent", "")
        if agent == self.name or not agent:
            self._last_decision_title = f"Proceeded: {title}"
            self._last_decision_ts = datetime.utcnow()
            self._decision_count += 1
        else:
            self._last_decision_title = f"Proceeded for {agent}: {title[:32]}"
            self._last_decision_ts = datetime.utcnow()

    async def _handle_inventory_restocked(self, event: Event) -> None:
        payload = event.payload or {}
        item_name = payload.get("item_name", "Supplies")
        qty = payload.get("quantity", 0)
        if "inventory" in self.name.lower() or "staffing" in self.name.lower():
            self._last_decision_title = f"Restocked {qty}x {item_name} (Procurement Complete)"
            self._last_decision_ts = datetime.utcnow()
            self._decision_count += 1

    async def _periodic_tick(self, sim_ts: datetime, tick_count: int) -> None:
        if tick_count % self.every_n_ticks != 0:
            return
        self._running = True
        try:
            await self.periodic(sim_ts, tick_count)
        except Exception:
            logger.exception("[%s] periodic() failed", self.name)
        finally:
            self._running = False

    # ------------------------------------------------------------------ #
    # Abstract interface
    # ------------------------------------------------------------------ #

    @abstractmethod
    async def on_event(self, event: Event) -> None:
        """Called when a subscribed event is published."""
        ...

    @abstractmethod
    async def periodic(self, sim_ts: datetime, tick_count: int) -> None:
        """Called every every_n_ticks ticks."""
        ...

    # ------------------------------------------------------------------ #
    # Decision emission
    # ------------------------------------------------------------------ #

    async def emit_decision(
        self,
        *,
        title: str,
        reasoning_steps: List[str],
        confidence: float,
        rupee_impact: float,
        counterfactual_text: str,
        counterfactual_rupees: float,
        autonomy: str = "auto",
        kind: str = "action",
        inputs: Dict[str, Any] = None,
        rollback_fn: Optional[Callable] = None,
        rollback_payload: Optional[Dict] = None,
        linked_event_id: Optional[str] = None,
        linked_entity: Optional[str] = None,
        cascade_id: Optional[str] = None,
    ) -> Decision:
        assert len(reasoning_steps) >= 3, (
            f"[{self.name}] Every decision must have ≥3 reasoning steps. Got {len(reasoning_steps)}."
        )
        d = Decision(
            agent=self.name,
            kind=kind,
            title=title,
            reasoning_steps=reasoning_steps,
            inputs=inputs or {},
            confidence=confidence,
            rupee_impact=rupee_impact,
            counterfactual_text=counterfactual_text,
            counterfactual_rupees=counterfactual_rupees,
            autonomy=autonomy,
            rollback_fn=rollback_fn,
            rollback_payload=rollback_payload,
            linked_event_id=linked_event_id,
            linked_entity=linked_entity,
            cascade_id=cascade_id,
        )
        await self._ledger.record(d)
        self._decision_count += 1
        self._last_decision_ts = datetime.utcnow()
        self._last_decision_title = title
        self._last_confidence = confidence
        return d

    # ------------------------------------------------------------------ #
    # Status (for agent rail in UI)
    # ------------------------------------------------------------------ #

    def status_dict(self) -> dict:
        return {
            "name": self.name,
            "running": self._running,
            "model_loaded": self._model_loaded,
            "decision_count": self._decision_count,
            "last_decision_ts": (
                self._last_decision_ts.isoformat() if self._last_decision_ts else None
            ),
            "last_decision_title": self._last_decision_title,
            "last_confidence": round(self._last_confidence, 3),
        }

    # ------------------------------------------------------------------ #
    # ML helpers
    # ------------------------------------------------------------------ #

    def _try_load_model(self, path: str) -> Optional[Any]:
        """Load a joblib model, returns None if file missing (fallback mode)."""
        try:
            import joblib
            model = joblib.load(path)
            self._model_loaded = True
            logger.info("[%s] Loaded model from %s", self.name, path)
            return model
        except FileNotFoundError:
            logger.warning(
                "[%s] Model file not found: %s — running on heuristic fallback.",
                self.name, path,
            )
            self._model_loaded = False
            return None
        except Exception:
            logger.exception("[%s] Failed to load model: %s", self.name, path)
            return None
