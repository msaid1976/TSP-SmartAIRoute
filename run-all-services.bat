@echo off
setlocal

cd /d "%~dp0"

echo Starting SmartRoute AI services with Docker Compose...
docker compose up --build -d
if errorlevel 1 exit /b %errorlevel%

echo.
echo Current service status:
docker compose ps
if errorlevel 1 exit /b %errorlevel%

echo.
echo SmartRoute AI should be available at http://localhost:3000/
