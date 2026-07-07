@echo off
setlocal
cd /d "%~dp0"
set "ARGS=%*"
if "%ARGS%"=="" set "ARGS=--sessions 20 --speed 25 --mix beginner:2,intermediate:5,advanced:2 --show --stage stage-12 --pieces basic_3_5,scatter_3_5,sniper_3_5,breaker_2_4,blast_2_5,support_2_2"
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
