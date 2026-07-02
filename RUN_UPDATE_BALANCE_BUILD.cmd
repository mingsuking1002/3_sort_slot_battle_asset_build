@echo off
setlocal
cd /d "%~dp0"

set "DATA_TABLE_SHEET=https://docs.google.com/spreadsheets/d/13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g/edit?usp=sharing"
set "LOG_SHEET=https://docs.google.com/spreadsheets/d/1Sy_vOpjJXiDLIzIHGsKtWkls7DStSdkYBllsDpZoSBI/edit?usp=sharing"
set "WEBAPP_URL=https://script.google.com/macros/s/AKfycby2IXOmu8MttsGyU2x-_nIjdTINdsZVx52gjPi6sWIu-4rKDVxuKqzrwCUvn3ON_x9tYg/exec"
set "VALIDATION_LOG=%TEMP%\slot-battle-balance-validation.log"
set "MIRROR_DIR=%~dp0..\3_sort_slot_battle_project_bundle_20260608\game_current"

title 3-Sort Balance Build Update

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  goto :failed
)

echo [1/5] Syncing game balance data from Google Sheets...
node tools\sync-game-data.mjs --sheet "%DATA_TABLE_SHEET%" --strict
if errorlevel 1 goto :failed

echo.
echo [2/5] Validating generated game data...
node tools\validate-phase-2-3.mjs . > "%VALIDATION_LOG%" 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Get-Content -LiteralPath $env:VALIDATION_LOG -Tail 40"
  goto :failed
)
findstr /C:"Summary:" "%VALIDATION_LOG%"

echo.
echo [3/5] Validating telemetry schema...
node tools\validate-telemetry-schema.mjs
if errorlevel 1 goto :failed

echo.
echo [4/5] Building balance dashboard data from play logs...
node tools\build-balance-dashboard.mjs --log-sheet "%LOG_SHEET%"
if errorlevel 1 goto :failed

echo.
echo [5/5] Updating deployment mirror...
if exist "%MIRROR_DIR%\index.html" (
  if not exist "%MIRROR_DIR%\assets\data\generated" mkdir "%MIRROR_DIR%\assets\data\generated"
  if not exist "%MIRROR_DIR%\assets\images\towers" mkdir "%MIRROR_DIR%\assets\images\towers"
  if not exist "%MIRROR_DIR%\docs\generated" mkdir "%MIRROR_DIR%\docs\generated"
  if not exist "%MIRROR_DIR%\tools" mkdir "%MIRROR_DIR%\tools"
  if not exist "%MIRROR_DIR%\balance-dashboard" mkdir "%MIRROR_DIR%\balance-dashboard"

  copy /Y "index.html" "%MIRROR_DIR%\index.html" >nul
  copy /Y "assets\data\game-data.js" "%MIRROR_DIR%\assets\data\game-data.js" >nul
  copy /Y "assets\data\generated\game-data.generated.js" "%MIRROR_DIR%\assets\data\generated\game-data.generated.js" >nul
  xcopy /E /I /Y "assets\images\towers" "%MIRROR_DIR%\assets\images\towers" >nul
  copy /Y "docs\DATA_TABLE_COLUMN_GUIDE.md" "%MIRROR_DIR%\docs\DATA_TABLE_COLUMN_GUIDE.md" >nul
  copy /Y "docs\DATA_TABLE_COLUMN_AUDIT.md" "%MIRROR_DIR%\docs\DATA_TABLE_COLUMN_AUDIT.md" >nul
  copy /Y "docs\generated\DATA_TABLE_SYNC_REPORT.md" "%MIRROR_DIR%\docs\generated\DATA_TABLE_SYNC_REPORT.md" >nul
  copy /Y "RUN_BALANCE_MODE.cmd" "%MIRROR_DIR%\RUN_BALANCE_MODE.cmd" >nul
  copy /Y "RUN_BALANCE_DASHBOARD.cmd" "%MIRROR_DIR%\RUN_BALANCE_DASHBOARD.cmd" >nul
  copy /Y "RUN_UPDATE_BALANCE_BUILD.cmd" "%MIRROR_DIR%\RUN_UPDATE_BALANCE_BUILD.cmd" >nul
  copy /Y "tools\build-balance-dashboard.mjs" "%MIRROR_DIR%\tools\build-balance-dashboard.mjs" >nul
  copy /Y "tools\exhibition-telemetry-apps-script.gs" "%MIRROR_DIR%\tools\exhibition-telemetry-apps-script.gs" >nul
  copy /Y "tools\sync-game-data.mjs" "%MIRROR_DIR%\tools\sync-game-data.mjs" >nul
  copy /Y "tools\game-data-schema.mjs" "%MIRROR_DIR%\tools\game-data-schema.mjs" >nul
  copy /Y "tools\validate-phase-2-3.mjs" "%MIRROR_DIR%\tools\validate-phase-2-3.mjs" >nul
  copy /Y "tools\validate-telemetry-schema.mjs" "%MIRROR_DIR%\tools\validate-telemetry-schema.mjs" >nul
  xcopy /E /I /Y "balance-dashboard" "%MIRROR_DIR%\balance-dashboard" >nul
)

echo.
echo Data table sheet: %DATA_TABLE_SHEET%
echo Balance log sheet: %LOG_SHEET%
echo Web app URL: %WEBAPP_URL%

if /I not "%BALANCE_NO_LAUNCH%"=="1" (
  start "" "%CD%\balance-dashboard\index.html"
  start "" "%CD%\index.html"
)

echo.
echo Done. The balance build, logs dashboard, and mirror are up to date.
exit /b 0

:failed
echo.
echo Stopped. Fix the error above and run this file again.
pause
exit /b 1
