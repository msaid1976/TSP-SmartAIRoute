FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# The image installs editable packages so local package boundaries stay identical inside Docker.
COPY . /app

RUN pip install --no-cache-dir -e /app/packages/shared/python -e /app/apps/api

WORKDIR /app/apps/api

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

