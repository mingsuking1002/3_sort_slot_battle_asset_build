@echo off
setlocal
cd /d "%~dp0"

set "LOG_SHEET=https://docs.google.com/spreadsheets/d/1Sy_vOpjJXiDLIzIHGsKtWkls7DStSdkYBllsDpZoSBI/edit?usp=sharing"
set "MIRROR_DIR=%~dp0..\3_sort_slot_battle_project_bundle_20260608\game_current"

title 3-Sort Balance Dashboard

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  pause
  exit /b 1
)

echo [1/2] Building dashboard data from balance snapshot and play logs...
node tools\build-balance-dashboard.mjs --log-sheet "%LOG_SHEET%"
if errorlevel 1 goto :failed

echo [2/2] Updating deployment mirror...
if exist "%MIRROR_DIR%\index.html" (
  if not exist "%MIRROR_DIR%\balance-dashboard" mkdir "%MIRROR_DIR%\balance-dashboard"
  xcopy /E /I /Y "balance-dashboard" "%MIRROR_DIR%\balance-dashboard" >nul
  copy /Y "tools\build-balance-dashboard.mjs" "%MIRROR_DIR%\tools\build-balance-dashboard.mjs" >nul
)

start "" "%CD%\balance-dashboard\index.html"
echo Done.
exit /b 0

:failed
echo.
echo Dashboard build failed. Check Sheet sharing and try again.
pause
exit /b 1
