"""
WebSocket ConnectionManager — manages connected clients and broadcasts
state-diff patches. Patches are small: only changed paths are sent.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._active: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._active.add(ws)
        logger.info("WS client connected. total=%d", len(self._active))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._active.discard(ws)
        logger.info("WS client disconnected. total=%d", len(self._active))

    async def broadcast(self, message: dict) -> None:
        """Send message to all connected clients, removing dead connections."""
        data = json.dumps(message, default=_json_default)
        dead: List[WebSocket] = []
        async with self._lock:
            clients = list(self._active)

        results = await asyncio.gather(
            *[_safe_send(ws, data) for ws in clients], return_exceptions=True
        )
        for ws, result in zip(clients, results):
            if isinstance(result, Exception):
                dead.append(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    self._active.discard(ws)

    async def broadcast_patch(
        self,
        paths: Dict[str, Any],
        sim_ts: datetime,
        events: list = None,
        decisions: list = None,
    ) -> None:
        """
        Broadcast a state-diff patch.
        paths:     {"zones.3.workload_index": 87, "guests.12.gers_score": 74, ...}
        events:    list of new Event dicts
        decisions: list of new Decision dicts
        """
        if not paths and not events and not decisions:
            return
        patch = {
            "type": "patch",
            "ts": datetime.utcnow().isoformat(),
            "sim_ts": sim_ts.isoformat(),
            "paths": paths,
            "events": events or [],
            "decisions": decisions or [],
        }
        await self.broadcast(patch)

    async def broadcast_full_state(self, state: dict, sim_ts: datetime) -> None:
        """Used on initial connect to send full snapshot."""
        await self.broadcast({
            "type": "snapshot",
            "ts": datetime.utcnow().isoformat(),
            "sim_ts": sim_ts.isoformat(),
            "state": state,
        })

    @property
    def client_count(self) -> int:
        return len(self._active)


async def _safe_send(ws: WebSocket, data: str) -> None:
    await ws.send_text(data)


def _json_default(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    raise TypeError(f"Not JSON serializable: {type(obj)}")


# Singleton
manager = ConnectionManager()
