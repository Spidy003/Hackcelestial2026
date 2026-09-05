"""Staff & Tasks API."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models import get_db
from backend.models.people import Staff, Task

router = APIRouter()

@router.get("/staff")
def get_staff(db: Session = Depends(get_db)):
    return [s.to_dict() for s in db.query(Staff).all()]

@router.get("/tasks")
def get_tasks(status: str = None, db: Session = Depends(get_db)):
    q = db.query(Task)
    if status:
        q = q.filter(Task.status == status)
    return [t.to_dict() for t in q.order_by(Task.created_at.desc()).limit(200).all()]

@router.post("/tasks/{task_id}/accept")
def accept_task(task_id: int, staff_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    task.status = "in_progress"
    task.accepted_at = datetime.utcnow()
    task.assigned_staff_id = staff_id
    staff = db.query(Staff).get(staff_id)
    if staff:
        staff.status = "busy"
        staff.current_task_id = task_id
    db.commit()
    return task.to_dict()

@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    task.status = "done"
    task.completed_at = datetime.utcnow()
    if task.accepted_at:
        task.actual_minutes = (task.completed_at - task.accepted_at).total_seconds() / 60
    staff = db.query(Staff).get(task.assigned_staff_id)
    if staff:
        staff.status = "idle"
        staff.current_task_id = None
    db.commit()
    # Notify guest if applicable
    if task.guest_id:
        from backend.core.bus import bus
        from backend.core.clock import clock
        await bus.publish(
            "task.completed",
            payload={"task_id": task_id, "guest_id": task.guest_id, "title": task.title},
            emitted_by="api",
            sim_ts=clock.sim_now,
        )
    return task.to_dict()
