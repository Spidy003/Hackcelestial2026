"""Concierge API — guest-facing chat."""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class MessageBody(BaseModel):
    guest_id: int
    text: str
    language: str = "en"

@router.post("/message")
async def send_message(body: MessageBody):
    from backend.agents.concierge import ConciergeAgent
    from backend.core.clock import clock
    # Use the singleton agent instance from app.state if available
    try:
        from backend.main import app
        concierge: ConciergeAgent = next(
            a for a in app.state.agents if isinstance(a, ConciergeAgent)
        )
    except Exception:
        concierge = ConciergeAgent()

    response = await concierge.handle_guest_message(
        guest_id=body.guest_id,
        text=body.text,
        language=body.language,
        sim_ts=clock.sim_now,
    )
    return response
