@echo off
title AEO-GEO Tracker Setup

echo ===================================================
echo   AEO-GEO Tracker: Environment Setup
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Installing Frontend (Next.js) packages...
cd geo-aeo-tracker-main
call npm install
cd ..
echo.

echo [2/2] Setting up Backend (Crawler)...
cd Crawler\aeo-crawler
python -m venv .venv
call .venv\Scripts\activate.bat
call pip install fastapi uvicorn playwright playwright-stealth pydantic
call playwright install chromium
call deactivate
cd ..\..
echo.

echo ===================================================
echo   Installation Completed! Press any key to exit.
echo ===================================================
pause
