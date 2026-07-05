@echo off
setlocal
cd /d "%~dp0"
set "ARGS=%*"
if "%ARGS%"=="" set "ARGS=--sessions 9 --speed 50 --mix beginner:2,intermediate:5,advanced:2 --show --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1"
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
