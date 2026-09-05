"""Clock control API."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class SpeedBody(BaseModel):
    speed: str

@router.post("/speed")
def set_speed(body: SpeedBody):
    from backend.core.clock import clock
    try:
        clock.set_speed(body.speed)
        return clock.state()
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/pause")
def pause():
    from backend.core.clock import clock
    clock.pause()
    return clock.state()

@router.post("/resume")
def resume():
    from backend.core.clock import clock
    clock.resume()
    return clock.state()

@router.get("/state")
def get_clock_state():
    from backend.core.clock import clock
    return clock.state()
