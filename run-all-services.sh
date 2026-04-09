#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

echo "Starting SmartRoute AI services with Docker Compose..."
docker compose up --build -d

echo
echo "Current service status:"
docker compose ps

echo
echo "SmartRoute AI should be available at http://localhost:3000/"
