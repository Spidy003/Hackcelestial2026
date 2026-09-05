"""ML model metrics API."""
import json
import os
from fastapi import APIRouter

router = APIRouter()

@router.get("")
@router.get("/")
def get_models_list():
    path = os.path.join(os.path.dirname(__file__), "..", "ml", "artifacts", "metrics.json")
    path = os.path.normpath(path)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        metrics = json.load(f)
    return metrics

@router.get("/metrics")
def get_model_metrics():
    path = os.path.join(os.path.dirname(__file__), "..", "ml", "artifacts", "metrics.json")
    path = os.path.normpath(path)
    if not os.path.exists(path):
        return {"status": "not_trained", "models": []}
    with open(path) as f:
        metrics = json.load(f)
    return {"status": "trained", "models": metrics}
