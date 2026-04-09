import logging

from smartroute_shared.schemas import PingResponse

from app.workers.celery_client import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="worker.ping")
def ping() -> dict[str, str]:
    response = PingResponse(status="ok", message="pong")
    logger.info("Processed ping task with payload=%s", response.model_dump())
    return response.model_dump()
