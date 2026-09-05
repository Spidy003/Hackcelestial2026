@echo off
title Smart Resort 360 Launcher
echo ========================================================
echo   Smart Resort 360 - AI Operations Platform
echo ========================================================
echo Starting FastAPI Backend on http://localhost:8000 ...
start "Smart Resort 360 Backend" cmd /k "cd /d %~dp0\backend && .venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Next.js Dashboard on http://localhost:3000 ...
start "Smart Resort 360 Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Both services launched!
echo - Backend API & Docs: http://localhost:8000/docs
echo - Frontend Dashboard: http://localhost:3000
echo ========================================================
