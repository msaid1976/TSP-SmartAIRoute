#!/usr/bin/env bash
# =============================================================================
#  SmartRoute AI — Stop All Services
#  Usage: ./stop.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${RESET}"; }
step() { echo -e "\n${BOLD}${CYAN}▶ $1${RESET}"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"

echo ""
echo -e "${BOLD}${CYAN}SmartRoute AI — Stopping all services${RESET}"
echo ""

step "Stopping FastAPI"
if [ -f "$PID_DIR/api.pid" ]; then
    PID=$(cat "$PID_DIR/api.pid")
    kill "$PID" 2>/dev/null && ok "FastAPI stopped (PID $PID)" || echo "   Already stopped"
    rm -f "$PID_DIR/api.pid"
else
    echo "   FastAPI PID not found — may already be stopped"
fi

step "Stopping Next.js"
if [ -f "$PID_DIR/web.pid" ]; then
    PID=$(cat "$PID_DIR/web.pid")
    kill "$PID" 2>/dev/null && ok "Next.js stopped (PID $PID)" || echo "   Already stopped"
    rm -f "$PID_DIR/web.pid"
else
    echo "   Next.js PID not found — may already be stopped"
fi

step "Stopping Docker services"
cd "$PROJECT_ROOT"
docker compose stop
ok "PostgreSQL, Redis, and Celery worker stopped"

echo ""
echo -e "${BOLD}All services stopped cleanly.${RESET}"
echo ""
