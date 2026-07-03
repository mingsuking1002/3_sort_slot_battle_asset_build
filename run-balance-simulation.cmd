@echo off
setlocal
cd /d "%~dp0"

set "ARGS=%*"
if "%ARGS%"=="" set "ARGS=--sessions 9 --speed 50 --show --coverage"

node "tools\simulation\simulate-balance.mjs" %ARGS%
if errorlevel 1 (
  echo.
  echo Simulation failed. Check the error above.
  pause
  exit /b 1
)
echo.
echo Balance simulation completed.
pause