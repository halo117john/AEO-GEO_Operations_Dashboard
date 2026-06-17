@echo off
title AEO-GEO Tracker Starter

echo ===================================================
echo   AEO-GEO Tracker: Starting Servers
echo ===================================================
echo 2 terminal windows will open shortly...
echo.

cd /d "%~dp0"

echo [1/2] Starting Frontend (Port 3000)
start "Frontend (Next.js)" /d "%~dp0geo-aeo-tracker-main" cmd /k "npm run dev"

echo [2/2] Starting Backend Crawler (Port 8000)
start "Backend (Crawler)" /d "%~dp0Crawler\aeo-crawler" cmd /k "call .venv\Scripts\activate.bat && python main.py"

echo.
echo ===================================================
echo   All servers have been started.
echo   Please check the 2 new windows for any errors.
echo ===================================================
pause
