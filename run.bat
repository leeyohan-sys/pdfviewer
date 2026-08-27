@echo off
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing packages...
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting PDF editor...
echo Press Ctrl+C in this window to stop.
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5173/"
call npm.cmd run dev
