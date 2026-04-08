from typing import Any

from celery import Celery
from celery.signals import worker_ready
from smartroute_shared.settings import get_shared_settings

settings = get_shared_settings()

celery_app = Celery(
    "smartroute-worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["worker_app.tasks"],
)

celery_app.conf.update(
    task_default_queue="smartroute",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@worker_ready.connect
def queue_startup_ping(sender: Celery, **kwargs: Any) -> None:
    del kwargs
    sender.app.send_task("worker.ping")
