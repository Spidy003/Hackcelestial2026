"""
DecisionLedger — append-only log of every agent action.
Supports autonomy dial: decisions above threshold_rupees emit as 'proposed'
and require human approval before state changes are applied.
Rollback actually reverses state via the stored rollback_payload callable.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class Decision:
    def __init__(
        self,
        *,
        agent: str,
        kind: str,
        title: str,
        reasoning_steps: List[str],  # must have >= 3 with real numbers
        inputs: Dict[str, Any],
        confidence: float,           # 0..1
        rupee_impact: float,
        counterfactual_text: str,
        counterfactual_rupees: float,
        autonomy: str,               # auto|proposed|approved|rejected|rolled_back
        rollback_fn: Optional[Callable] = None,  # async callable that reverses state
        rollback_payload: Optional[Dict] = None,
        linked_event_id: Optional[str] = None,
        linked_entity: Optional[str] = None,
        cascade_id: Optional[str] = None,
        ts: Optional[datetime] = None,
    ) -> None:
        self.id = str(uuid.uuid4())
        from backend.core.clock import clock
        self.ts = ts or (clock.sim_now if clock and hasattr(clock, "sim_now") and clock.sim_now else datetime.utcnow())
        self.agent = agent
        self.kind = kind
        self.title = title
        self.reasoning_steps = reasoning_steps
        self.inputs = inputs
        self.confidence = confidence
        self.rupee_impact = rupee_impact
        self.counterfactual_text = counterfactual_text
        self.counterfactual_rupees = counterfactual_rupees
        self.autonomy = autonomy
        self._rollback_fn = rollback_fn
        self.rollback_payload = rollback_payload or {}
        self.linked_event_id = linked_event_id
        self.linked_entity = linked_entity
        self.cascade_id = cascade_id

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ts": self.ts.isoformat(),
            "agent": self.agent,
            "kind": self.kind,
            "title": self.title,
            "reasoning_steps": self.reasoning_steps,
            "inputs": self.inputs,
            "confidence": round(self.confidence, 3),
            "rupee_impact": round(self.rupee_impact, 2),
            "counterfactual_text": self.counterfactual_text,
            "counterfactual_rupees": round(self.counterfactual_rupees, 2),
            "autonomy": self.autonomy,
            "rollback_payload": self.rollback_payload,
            "linked_event_id": self.linked_event_id,
            "linked_entity": self.linked_entity,
            "cascade_id": self.cascade_id,
        }


class DecisionLedger:
    def __init__(self, threshold_rupees: float = 5000.0) -> None:
        self.threshold_rupees = threshold_rupees
        self._decisions: List[Decision] = []
        self._lock = asyncio.Lock()
        # Callbacks notified when a new decision is recorded
        self._listeners: List[Callable] = []

    # ------------------------------------------------------------------ #
    # Autonomy dial
    # ------------------------------------------------------------------ #

    def set_threshold(self, rupees: float) -> None:
        self.threshold_rupees = rupees
        logger.info("Autonomy threshold → ₹%.0f", rupees)

    def _should_propose(self, d: Decision) -> bool:
        return abs(d.rupee_impact) >= self.threshold_rupees

    # ------------------------------------------------------------------ #
    # Recording
    # ------------------------------------------------------------------ #

    async def record(self, decision: Decision) -> Decision:
        """Record a decision. If rupee_impact ≥ threshold, flip to 'proposed'."""
        if decision.autonomy == "auto" and self._should_propose(decision):
            decision.autonomy = "proposed"

        async with self._lock:
            self._decisions.append(decision)

        for listener in self._listeners:
            try:
                await listener(decision)
            except Exception:
                logger.exception("Ledger listener failed")

        logger.info(
            "[%s] %s | ₹%.0f | %s",
            decision.agent,
            decision.title[:60],
            decision.rupee_impact,
            decision.autonomy,
        )
        return decision

    def add_listener(self, fn: Callable) -> None:
        self._listeners.append(fn)

    # ------------------------------------------------------------------ #
    # Queries
    # ------------------------------------------------------------------ #

    def all(self, agent: Optional[str] = None, status: Optional[str] = None) -> List[Decision]:
        results = self._decisions
        if agent:
            results = [d for d in results if d.agent == agent]
        if status:
            results = [d for d in results if d.autonomy == status]
        return list(reversed(results))  # newest first

    def get(self, decision_id: str) -> Optional[Decision]:
        for d in self._decisions:
            if d.id == decision_id:
                return d
        return None

    def stats(self) -> dict:
        total = len(self._decisions)
        auto = sum(1 for d in self._decisions if d.autonomy == "auto")
        proposed = sum(1 for d in self._decisions if d.autonomy == "proposed")
        approved = sum(1 for d in self._decisions if d.autonomy == "approved")
        rejected = sum(1 for d in self._decisions if d.autonomy == "rejected")
        rolled_back = sum(1 for d in self._decisions if d.autonomy == "rolled_back")
        total_impact = sum(d.rupee_impact for d in self._decisions if d.autonomy in ("auto", "approved"))
        return {
            "total": total,
            "auto": auto,
            "proposed": proposed,
            "approved": approved,
            "rejected": rejected,
            "rolled_back": rolled_back,
            "total_rupee_impact": round(total_impact, 2),
        }

    # ------------------------------------------------------------------ #
    # Approve / Reject / Rollback
    # ------------------------------------------------------------------ #

    async def approve(self, decision_id: str) -> Optional[Decision]:
        d = self.get(decision_id)
        if d and d.autonomy == "proposed":
            d.autonomy = "approved"
            logger.info("Decision %s approved", decision_id[:8])
        return d

    async def reject(self, decision_id: str) -> Optional[Decision]:
        d = self.get(decision_id)
        if d and d.autonomy == "proposed":
            d.autonomy = "rejected"
            logger.info("Decision %s rejected", decision_id[:8])
        return d

    async def rollback(self, decision_id: str) -> Optional[Decision]:
        d = self.get(decision_id)
        if d and d.autonomy in ("auto", "approved") and d._rollback_fn:
            try:
                await d._rollback_fn(d.rollback_payload)
                d.autonomy = "rolled_back"
                logger.info("Decision %s rolled back", decision_id[:8])
            except Exception:
                logger.exception("Rollback failed for %s", decision_id[:8])
        return d

    def clear(self) -> None:
        """Used by reset_demo."""
        self._decisions.clear()


# Singleton
ledger = DecisionLedger()
