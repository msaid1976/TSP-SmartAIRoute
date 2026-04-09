@echo off
:: =============================================================================
::  SmartRoute AI — Windows Stop Launcher
::  Double-click to stop all SmartRoute AI services.
:: =============================================================================

title SmartRoute AI — Stopping...

echo.
echo  ============================================================
echo   SmartRoute AI — Stopping all services
echo  ============================================================
echo.

:: Stop Docker services directly from Windows
docker compose -f "%USERPROFILE%\projects\SmartRouteAI\docker-compose.yml" stop >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] PostgreSQL, Redis, and Celery worker stopped
) else (
    echo  [INFO] Docker services were already stopped or not found
)

:: Kill FastAPI and Next.js via WSL
wsl -d Ubuntu -- bash -c "
  PID_DIR=~/projects/SmartRouteAI/.pids
  if [ -f \$PID_DIR/api.pid ]; then
    kill \$(cat \$PID_DIR/api.pid) 2>/dev/null && echo '[OK] FastAPI stopped' || echo '[INFO] FastAPI already stopped'
    rm -f \$PID_DIR/api.pid
  fi
  if [ -f \$PID_DIR/web.pid ]; then
    kill \$(cat \$PID_DIR/web.pid) 2>/dev/null && echo '[OK] Next.js stopped' || echo '[INFO] Next.js already stopped'
    rm -f \$PID_DIR/web.pid
  fi
"

echo.
echo  All SmartRoute AI services stopped.
echo.
pause
