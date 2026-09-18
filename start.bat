@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ❌ 未检测到 Node.js，请先安装: https://nodejs.org/  (需 22.5+)
  echo.
  pause
  exit /b 1
)
node bin/tokenburn.js %*
echo.
pause