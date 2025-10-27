from fastapi import APIRouter, HTTPException
from fastapi import Depends
from typing import Dict

# Placeholder dependencies; to be wired with real storage and controller
from ..controllers.ab_test_controller import ABTestController

router = APIRouter(prefix="/ab-tests", tags=["ab-tests"])

# Dependency injection placeholders

def get_storage():
    # TODO: provide real storage backend (DB/JSON)
    raise NotImplementedError

def get_controller(storage=Depends(get_storage)):
    return ABTestController(storage)

@router.post("/")
async def create_ab_test(payload: Dict, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.create_test(payload, created_by="system")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{test_id}/start")
async def start_ab_test(test_id: str, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.start_test(test_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{test_id}/pause")
async def pause_ab_test(test_id: str, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.pause_test(test_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{test_id}/complete")
async def complete_ab_test(test_id: str, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.complete_test(test_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{test_id}/aggregate")
async def aggregate_test(test_id: str, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.aggregate_metrics(test_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{test_id}/report")
async def generate_report(test_id: str, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.generate_report(test_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{test_id}/results")
async def record_result(test_id: str, payload: Dict, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.record_result(test_id=test_id, **payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{test_id}/compare")
async def create_pair(test_id: str, payload: Dict, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.create_comparison_pair(test_id, payload["result_a_id"], payload["result_b_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/rate/{comparison_id}")
async def rate_pair(comparison_id: str, payload: Dict, controller: ABTestController = Depends(get_controller)):
    try:
        return controller.submit_user_rating(
            comparison_id,
            user_preference=payload["user_preference"],
            rating_dimensions=payload.get("rating_dimensions", {}),
            feedback=payload.get("feedback"),
            rated_by=payload.get("rated_by", "anonymous"),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
