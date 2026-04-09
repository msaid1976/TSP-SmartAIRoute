@echo off
:: =============================================================================
::  SmartRoute AI — Windows Launcher
::  Double-click this file from Windows File Explorer to start everything.
::
::  What this does:
::    1. Opens Windows Terminal (or CMD if not installed) with WSL
::    2. Navigates to your SmartRoute AI project in WSL
::    3. Runs start.sh which starts all services
::
::  Requirements:
::    - WSL2 with Ubuntu installed (see setup guide)
::    - Docker Desktop running
::    - SmartRoute AI project at ~/projects/SmartRouteAI inside WSL
::
::  To stop: press Ctrl+C in the terminal window that opens
:: =============================================================================

title SmartRoute AI — Starting...

echo.
echo  ============================================================
echo   SmartRoute AI — Windows Launcher
echo  ============================================================
echo.

:: Check Docker Desktop is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker Desktop is not running.
    echo  Please open Docker Desktop and wait for the whale icon
    echo  in the taskbar to stop animating, then run this again.
    echo.
    pause
    exit /b 1
)

echo  [OK] Docker Desktop is running

:: Check WSL is available
wsl --status >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] WSL is not installed or not working.
    echo  Please follow the setup guide to install WSL2.
    echo.
    pause
    exit /b 1
)

echo  [OK] WSL2 is available
echo.
echo  Opening terminal and starting all services...
echo  (This window can be closed once the terminal opens)
echo.

:: Try Windows Terminal first (better experience), fall back to wsl directly
where wt >nul 2>&1
if %errorlevel% equ 0 (
    :: Windows Terminal is installed — use it for a nice tabbed experience
    start "" wt wsl -d Ubuntu -- bash -c "cd ~/projects/SmartRouteAI && chmod +x start.sh && ./start.sh; exec bash"
) else (
    :: Fall back to running WSL in a standard CMD window
    start "" wsl -d Ubuntu -- bash -c "cd ~/projects/SmartRouteAI && chmod +x start.sh && ./start.sh; exec bash"
)

echo  Terminal opened. SmartRoute AI is starting inside WSL.
echo.
echo  Once you see the green "SmartRoute AI is fully running!" message:
echo    - Frontend: http://localhost:3000
echo    - API:      http://localhost:8000
echo    - API docs: http://localhost:8000/docs
echo.
echo  To stop: press Ctrl+C in the WSL terminal window.
echo.

timeout /t 5 >nul
exit /b 0
