@echo off
setlocal
cd /d "%~dp0"
set "ARGS=%*"
if "%ARGS%"=="" set "ARGS=--sessions 100 --speed 10 --mix beginner:2,intermediate:5,advanced:2 --show --stage stage-1 --pieces basic_1_1,scatter_1_1,sniper_1_1,breaker_1_1,blast_1_1,support_1_1"
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
