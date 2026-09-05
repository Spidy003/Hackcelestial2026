"""
SimClock — advances simulated resort time and drives the main tick loop.
Real-time: one tick every tick_ms milliseconds.
Sim-time: sim_minutes_per_tick advances per tick (configurable speed).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Callable, List, Optional

logger = logging.getLogger(__name__)

SPEEDS = {
    "1x": 5,    # 5 sim-minutes per real second
    "10x": 30,  # 30 sim-minutes per real second
    "60x": 120, # 120 sim-minutes per real second
}


class SimClock:
    tick_ms: int = 1000  # real milliseconds per tick

    def __init__(
        self,
        start_sim_time: Optional[datetime] = None,
        speed: str = "10x",
    ) -> None:
        # Start from a sensible "demo morning"
        self.sim_now: datetime = start_sim_time or datetime(2026, 9, 6, 8, 0, 0)
        self.speed: str = speed
        self.sim_minutes_per_tick: int = SPEEDS[speed]
        self._paused: bool = False
        self._tick_count: int = 0
        self._running: bool = False
        self._task: Optional[asyncio.Task] = None

        # Ordered list of (every_n_ticks, async callable)
        self._periodic_handlers: List[tuple[int, Callable]] = []
        # Single ordered list of tick listeners (called every tick)
        self._tick_listeners: List[Callable] = []

    # ------------------------------------------------------------------ #
    # Registration
    # ------------------------------------------------------------------ #

    def register_periodic(self, every_n_ticks: int, handler: Callable) -> None:
        self._periodic_handlers.append((every_n_ticks, handler))

    def register_tick_listener(self, handler: Callable) -> None:
        """Called every tick before periodic handlers."""
        self._tick_listeners.append(handler)

    # ------------------------------------------------------------------ #
    # Control
    # ------------------------------------------------------------------ #

    def set_speed(self, speed: str) -> None:
        if speed not in SPEEDS:
            raise ValueError(f"Unknown speed '{speed}'. Valid: {list(SPEEDS)}")
        self.speed = speed
        self.sim_minutes_per_tick = SPEEDS[speed]
        logger.info("Clock speed → %s (%d sim-min/tick)", speed, self.sim_minutes_per_tick)

    def pause(self) -> None:
        self._paused = True
        logger.info("Clock paused at sim_now=%s", self.sim_now)

    def resume(self) -> None:
        self._paused = False
        logger.info("Clock resumed at sim_now=%s", self.sim_now)

    def reset(self, start_sim_time: Optional[datetime] = None) -> None:
        """Hard reset — used by reset_demo."""
        self.sim_now = start_sim_time or datetime(2026, 9, 6, 8, 0, 0)
        self._tick_count = 0
        logger.info("Clock reset to %s", self.sim_now)

    # ------------------------------------------------------------------ #
    # Main loop
    # ------------------------------------------------------------------ #

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("SimClock started. sim_now=%s speed=%s", self.sim_now, self.speed)

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        interval = self.tick_ms / 1000.0
        while self._running:
            try:
                await asyncio.sleep(interval)
                if self._paused:
                    continue
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("SimClock tick error")

    async def _tick(self) -> None:
        # 1. Advance sim time
        self.sim_now += timedelta(minutes=self.sim_minutes_per_tick)
        self._tick_count += 1

        # 2. Notify tick listeners (generators, derived-field recompute, broadcast)
        for listener in self._tick_listeners:
            try:
                await listener(self.sim_now, self._tick_count)
            except Exception:
                logger.exception("Tick listener %s failed", getattr(listener, "__name__", "?"))

        # 3. Run periodic handlers whose cadence is due
        for every_n, handler in self._periodic_handlers:
            if self._tick_count % every_n == 0:
                try:
                    await handler(self.sim_now, self._tick_count)
                except Exception:
                    logger.exception("Periodic handler %s failed", getattr(handler, "__name__", "?"))

    # ------------------------------------------------------------------ #
    # Info
    # ------------------------------------------------------------------ #

    def state(self) -> dict:
        return {
            "sim_now": self.sim_now.isoformat(),
            "speed": self.speed,
            "sim_minutes_per_tick": self.sim_minutes_per_tick,
            "paused": self._paused,
            "tick_count": self._tick_count,
        }


# Singleton
clock = SimClock()
