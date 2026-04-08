FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Keeping the worker editable inside the image makes the package layout match local development.
COPY . /app

RUN pip install --no-cache-dir -e /app/packages/shared/python -e /app/apps/worker

WORKDIR /app/apps/worker

CMD ["celery", "-A", "worker_app.celery_app:celery_app", "worker", "--loglevel=info"]

