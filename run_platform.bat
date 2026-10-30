@echo off
echo ========================================================
echo  Starting EdgeTrust AI Enterprise Platform v2.0
echo ========================================================

:: 1. Start FastAPI backend in its own terminal window
start "EdgeTrust Backend (FastAPI)" cmd /k "venv\Scripts\activate.bat && uvicorn server:app --reload --port 8000"

:: 2. Start Next.js frontend in its own terminal window
start "EdgeTrust Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

echo.
echo [✓] Backend initialized at http://localhost:8000
echo [✓] Frontend dev server starting at http://localhost:3000
echo.
timeout /t 3 >nul
start http://localhost:3000