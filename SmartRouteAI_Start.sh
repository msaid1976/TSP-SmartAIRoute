#!/usr/bin/env bash
# =============================================================================
#  SmartRoute AI — Full Stack Startup Script
#  Run this once to bring everything up and open your browser automatically.
#
#  Usage:
#    chmod +x start.sh          (first time only — makes it executable)
#    ./start.sh                 (every day after that)
#
#  What this script starts:
#    1. Docker Compose  → PostgreSQL 15  (port 5432)
#                       → Redis 7        (port 6379)
#                       → Celery Worker  (background)
#    2. FastAPI backend → port 8000       (auto-reloads on code change)
#    3. Next.js frontend → port 3000      (auto-reloads on code change)
#
#  When everything is ready you will see:
#    ✅ PostgreSQL ready
#    ✅ Redis ready
#    ✅ FastAPI ready at http://localhost:8000
#    ✅ Frontend ready at http://localhost:3000
#    ✅ All services running — SmartRoute AI is live!
#
#  To stop everything: press Ctrl+C  OR  run ./stop.sh
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
ok()   { echo -e "${GREEN}✅ $1${RESET}"; }
info() { echo -e "${CYAN}   $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠️  $1${RESET}"; }
err()  { echo -e "${RED}❌ $1${RESET}"; }
step() { echo -e "\n${BOLD}${BLUE}▶ $1${RESET}"; }

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"
WEB_DIR="$PROJECT_ROOT/apps/web"
VENV_DIR="$API_DIR/venv"
LOG_DIR="$PROJECT_ROOT/logs"

API_PORT=8000
WEB_PORT=3000
DB_PORT=5432
REDIS_PORT=6379

API_HEALTH="http://localhost:${API_PORT}/api/health"
WEB_URL="http://localhost:${WEB_PORT}"

# PID files so we can kill processes cleanly in stop.sh
PID_DIR="$PROJECT_ROOT/.pids"

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║         SmartRoute AI — Full Stack Startup                   ║${RESET}"
echo -e "${BOLD}${CYAN}║         8 solvers · Generic TSP platform                    ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Prerequisites check ───────────────────────────────────────────────────────
step "Checking prerequisites"

check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        err "$1 is not installed. Please follow the setup guide in SmartRouteAI_MasterGuide_v2_FINAL.md"
        exit 1
    fi
    ok "$1 found"
}

check_cmd docker
check_cmd "docker compose" 2>/dev/null || check_cmd "docker-compose"
check_cmd node
check_cmd pnpm
check_cmd python3

# ── Make sure we are in the project root ──────────────────────────────────────
step "Locating project"

if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    err "docker-compose.yml not found in $PROJECT_ROOT"
    err "Make sure start.sh is in the SmartRouteAI project root folder."
    exit 1
fi
ok "Project root: $PROJECT_ROOT"

# ── Create directories ────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR" "$PID_DIR"

# ── Cleanup function — called on Ctrl+C ──────────────────────────────────────
cleanup() {
    echo ""
    step "Shutting down all services..."

    # Kill FastAPI
    if [ -f "$PID_DIR/api.pid" ]; then
        PID=$(cat "$PID_DIR/api.pid")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null
            ok "FastAPI stopped"
        fi
        rm -f "$PID_DIR/api.pid"
    fi

    # Kill Next.js
    if [ -f "$PID_DIR/web.pid" ]; then
        PID=$(cat "$PID_DIR/web.pid")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null
            ok "Next.js stopped"
        fi
        rm -f "$PID_DIR/web.pid"
    fi

    # Stop Docker services
    cd "$PROJECT_ROOT"
    docker compose stop 2>/dev/null
    ok "Docker services stopped"

    echo ""
    echo -e "${BOLD}SmartRoute AI stopped cleanly. See you next time!${RESET}"
    echo ""
    exit 0
}
trap cleanup INT TERM

# ── Step 1 — Docker Compose (PostgreSQL + Redis + Celery worker) ──────────────
step "Starting Docker services (PostgreSQL · Redis · Celery worker)"

cd "$PROJECT_ROOT"

# Stop any stale containers from a previous unclean shutdown
docker compose down --remove-orphans 2>/dev/null || true

# Start fresh
docker compose up -d --remove-orphans
info "Containers started. Waiting for PostgreSQL and Redis to be healthy..."

# Wait for PostgreSQL
echo -n "   Waiting for PostgreSQL"
for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U postgres &>/dev/null 2>&1; then
        echo ""
        ok "PostgreSQL ready on port $DB_PORT"
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo ""
        err "PostgreSQL did not become ready in 30 seconds."
        err "Run: docker compose logs db"
        exit 1
    fi
done

# Wait for Redis
echo -n "   Waiting for Redis"
for i in $(seq 1 20); do
    if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo ""
        ok "Redis ready on port $REDIS_PORT"
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 20 ]; then
        echo ""
        err "Redis did not respond in 20 seconds."
        err "Run: docker compose logs redis"
        exit 1
    fi
done

ok "Celery worker running (check: docker compose logs worker)"

# ── Step 2 — Python virtual environment ──────────────────────────────────────
step "Setting up Python virtual environment"

if [ ! -d "$VENV_DIR" ]; then
    info "Creating virtual environment for the first time..."
    python3 -m venv "$VENV_DIR"
    ok "Virtual environment created at $VENV_DIR"
fi

# Activate venv
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
ok "Virtual environment activated"

# Install / update Python dependencies if requirements.txt changed
if [ -f "$API_DIR/requirements.txt" ]; then
    REQS_HASH_FILE="$PID_DIR/reqs.hash"
    CURRENT_HASH=$(md5sum "$API_DIR/requirements.txt" | cut -d' ' -f1)
    STORED_HASH=""
    [ -f "$REQS_HASH_FILE" ] && STORED_HASH=$(cat "$REQS_HASH_FILE")

    if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
        info "requirements.txt changed — installing dependencies..."
        pip install -q -r "$API_DIR/requirements.txt"
        echo "$CURRENT_HASH" > "$REQS_HASH_FILE"
        ok "Python dependencies installed"
    else
        ok "Python dependencies up to date"
    fi
else
    warn "No requirements.txt found in apps/api — skipping pip install"
fi

# Run Alembic migrations automatically
if [ -f "$API_DIR/alembic.ini" ]; then
    info "Running database migrations..."
    cd "$API_DIR"
    alembic upgrade head 2>&1 | tail -3
    ok "Database migrations applied"
    cd "$PROJECT_ROOT"
else
    warn "No alembic.ini found — skipping migrations (normal for Phase 001)"
fi

# ── Step 3 — FastAPI backend ──────────────────────────────────────────────────
step "Starting FastAPI backend"

cd "$API_DIR"
nohup uvicorn main:app \
    --host 0.0.0.0 \
    --port "$API_PORT" \
    --reload \
    --log-level info \
    > "$LOG_DIR/api.log" 2>&1 &

API_PID=$!
echo "$API_PID" > "$PID_DIR/api.pid"
info "FastAPI started (PID $API_PID). Waiting for health check..."

# Wait for FastAPI to be ready
echo -n "   Waiting for FastAPI"
for i in $(seq 1 30); do
    if curl -sf "$API_HEALTH" &>/dev/null; then
        echo ""
        ok "FastAPI ready at http://localhost:${API_PORT}"
        info "Health: $(curl -s "$API_HEALTH")"
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo ""
        err "FastAPI did not start in 30 seconds."
        err "Check the log: cat logs/api.log"
        cat "$LOG_DIR/api.log" | tail -20
        exit 1
    fi
done

cd "$PROJECT_ROOT"

# ── Step 4 — Next.js frontend ─────────────────────────────────────────────────
step "Starting Next.js frontend"

cd "$WEB_DIR"

# Install Node dependencies if node_modules is missing or package.json changed
PKG_HASH_FILE="$PID_DIR/pkg.hash"
CURRENT_PKG_HASH=$(md5sum package.json | cut -d' ' -f1)
STORED_PKG_HASH=""
[ -f "$PKG_HASH_FILE" ] && STORED_PKG_HASH=$(cat "$PKG_HASH_FILE")

if [ ! -d "node_modules" ] || [ "$CURRENT_PKG_HASH" != "$STORED_PKG_HASH" ]; then
    info "Installing Node.js dependencies (this may take 1–2 minutes first time)..."
    pnpm install --silent
    echo "$CURRENT_PKG_HASH" > "$PKG_HASH_FILE"
    ok "Node.js dependencies installed"
else
    ok "Node.js dependencies up to date"
fi

# Start Next.js dev server
nohup pnpm dev \
    > "$LOG_DIR/web.log" 2>&1 &

WEB_PID=$!
echo "$WEB_PID" > "$PID_DIR/web.pid"
info "Next.js started (PID $WEB_PID). Waiting for it to compile..."

# Wait for Next.js to be ready (it takes longer than FastAPI)
echo -n "   Waiting for Next.js"
for i in $(seq 1 60); do
    if curl -sf "$WEB_URL" &>/dev/null; then
        echo ""
        ok "Frontend ready at http://localhost:${WEB_PORT}"
        break
    fi
    echo -n "."
    sleep 2
    if [ "$i" -eq 60 ]; then
        echo ""
        warn "Next.js took more than 2 minutes to start."
        warn "It may still be compiling. Check: cat logs/web.log"
        warn "Try opening http://localhost:${WEB_PORT} in your browser anyway."
    fi
done

cd "$PROJECT_ROOT"

# ── All done ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║          ✅  SmartRoute AI is fully running!                 ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Frontend:${RESET}   ${CYAN}http://localhost:${WEB_PORT}${RESET}"
echo -e "  ${BOLD}API:${RESET}        ${CYAN}http://localhost:${API_PORT}${RESET}"
echo -e "  ${BOLD}API docs:${RESET}   ${CYAN}http://localhost:${API_PORT}/docs${RESET}  (Swagger UI)"
echo -e "  ${BOLD}API health:${RESET} ${CYAN}http://localhost:${API_PORT}/api/health${RESET}"
echo ""
echo -e "  ${BOLD}Logs:${RESET}"
echo -e "    API:      ${YELLOW}tail -f logs/api.log${RESET}"
echo -e "    Frontend: ${YELLOW}tail -f logs/web.log${RESET}"
echo -e "    Worker:   ${YELLOW}docker compose logs -f worker${RESET}"
echo ""
echo -e "  ${BOLD}Press Ctrl+C to stop all services.${RESET}"
echo ""

# ── Open browser (WSL tries xdg-open; falls back silently) ───────────────────
if command -v xdg-open &>/dev/null; then
    xdg-open "$WEB_URL" &>/dev/null &
elif command -v wslview &>/dev/null; then
    wslview "$WEB_URL" &>/dev/null &
fi

# ── Keep script alive so Ctrl+C triggers cleanup ─────────────────────────────
wait
