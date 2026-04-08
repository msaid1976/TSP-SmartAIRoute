from fastapi import APIRouter, HTTPException, status
from smartroute_shared.schemas import HealthResponse

from app.services.health import HealthCheckError, build_health_response

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    try:
        return build_health_response()
    except HealthCheckError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
