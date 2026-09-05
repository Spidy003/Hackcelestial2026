"""
EventBus — in-process asyncio pub/sub with cascade tracking and replay buffer.
Every event published gets a unique id, a cascade_id, and an optional parent_event_id
so downstream UIs can render the full cascade tree.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from collections import defaultdict, deque
from datetime import datetime
from typing import Callable, Dict, List, Optional

from backend.models.intelligence import Event

logger = logging.getLogger(__name__)

REPLAY_BUFFER_SIZE = 500


class EventBus:
    def __init__(self) -> None:
        # event_type -> list of async handlers
        self._handlers: Dict[str, List[Callable]] = defaultdict(list)
        # wildcard handlers receive every event
        self._wildcard: List[Callable] = []
        # rolling replay buffer (deque keeps it bounded)
        self._buffer: deque[Event] = deque(maxlen=REPLAY_BUFFER_SIZE)
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------ #
    # Subscription
    # ------------------------------------------------------------------ #

    def subscribe(self, event_type: str, handler: Callable) -> None:
        """Register an async handler for a specific event type."""
        if event_type == "*":
            self._wildcard.append(handler)
        else:
            self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: Callable) -> None:
        if event_type == "*":
            self._wildcard = [h for h in self._wildcard if h is not handler]
        else:
            self._handlers[event_type] = [
                h for h in self._handlers[event_type] if h is not handler
            ]

    # ------------------------------------------------------------------ #
    # Publishing
    # ------------------------------------------------------------------ #

    async def publish(
        self,
        event_type: str,
        payload: dict,
        emitted_by: str = "sim",
        cascade_id: Optional[str] = None,
        parent_event_id: Optional[str] = None,
        sim_ts: Optional[datetime] = None,
    ) -> Event:
        """
        Publish an event.  If cascade_id is None a new cascade starts here.
        Returns the Event so callers can chain parent_event_id on children.
        """
        event = Event(
            id=str(uuid.uuid4()),
            ts=datetime.utcnow(),
            sim_ts=sim_ts or datetime.utcnow(),
            type=event_type,
            payload=payload,
            emitted_by=emitted_by,
            cascade_id=cascade_id or str(uuid.uuid4()),
            parent_event_id=parent_event_id,
        )

        async with self._lock:
            self._buffer.append(event)

        # Fire handlers concurrently but gather exceptions so one bad handler
        # doesn't kill others.
        handlers = self._handlers.get(event_type, []) + self._wildcard
        if handlers:
            results = await asyncio.gather(
                *[h(event) for h in handlers], return_exceptions=True
            )
            for i, r in enumerate(results):
                if isinstance(r, Exception):
                    logger.error(
                        "EventBus handler %s raised: %s",
                        getattr(handlers[i], "__qualname__", "?"),
                        r,
                        exc_info=r,
                    )

        return event

    # ------------------------------------------------------------------ #
    # Replay
    # ------------------------------------------------------------------ #

    def replay(self, since_ts: Optional[datetime] = None) -> List[Event]:
        """Return buffered events newer than since_ts (all if None)."""
        if since_ts is None:
            return list(self._buffer)
        return [e for e in self._buffer if e.ts > since_ts]

    def recent(self, n: int = 50) -> List[Event]:
        """Return the n most recent events."""
        buf = list(self._buffer)
        return buf[-n:]

    def clear(self) -> None:
        """Clear the replay buffer (used by reset_demo)."""
        self._buffer.clear()


# Singleton — imported everywhere
bus = EventBus()
