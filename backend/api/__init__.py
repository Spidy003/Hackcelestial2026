"""API package — aggregates all routers."""
from fastapi import APIRouter

from backend.api.resort import router as resort_router
from backend.api.staff import router as staff_router
from backend.api.guests import router as guests_router
from backend.api.assets import router as assets_router
from backend.api.inventory import router as inventory_router
from backend.api.revenue import router as revenue_router
from backend.api.ledger import router as ledger_router
from backend.api.sim import router as sim_router
from backend.api.clock import router as clock_router
from backend.api.concierge import router as concierge_router
from backend.api.models import router as models_router

router = APIRouter()
router.include_router(resort_router, prefix="/resort", tags=["resort"])
router.include_router(staff_router, prefix="", tags=["staff"])
router.include_router(guests_router, prefix="", tags=["guests"])
router.include_router(assets_router, prefix="", tags=["assets"])
router.include_router(inventory_router, prefix="", tags=["inventory"])
router.include_router(revenue_router, prefix="", tags=["revenue"])
router.include_router(ledger_router, prefix="/ledger", tags=["ledger"])
router.include_router(sim_router, prefix="/sim", tags=["sim"])
router.include_router(clock_router, prefix="/clock", tags=["clock"])
router.include_router(concierge_router, prefix="/concierge", tags=["concierge"])
router.include_router(models_router, prefix="/models", tags=["models"])
