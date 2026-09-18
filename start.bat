@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js not found. Please install from https://nodejs.org/
  echo.
  pause
  exit /b 1
)
node bin/tokenburn.js %*
echo.
pause
