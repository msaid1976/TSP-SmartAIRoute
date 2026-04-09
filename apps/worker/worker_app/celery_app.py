from typing import Any

from celery.signals import worker_ready
from celery import Celery

from app.workers.celery_client import celery_app
from app.workers.tasks import run_solver_task  # noqa: F401
from worker_app.tasks import ping  # noqa: F401


@worker_ready.connect
def queue_startup_ping(sender: Celery, **kwargs: Any) -> None:
    del kwargs
    sender.app.send_task("worker.ping")
