@echo off
setlocal
cd /d "%~dp0"

set "SHEET_URL=https://docs.google.com/spreadsheets/d/13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g/edit?usp=sharing"
set "VALIDATION_LOG=%TEMP%\slot-battle-balance-validation.log"
set "MIRROR_DIR=%~dp0..\3_sort_slot_battle_project_bundle_20260608\game_current"

title 3-Sort Slot Battle - Balance Sync

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  goto :failed
)

echo [1/3] Syncing balance data from Google Sheets...
node tools\sync-game-data.mjs --sheet "%SHEET_URL%" --strict
if errorlevel 1 goto :failed

echo.
echo [2/3] Validating game data...
node tools\validate-phase-2-3.mjs . > "%VALIDATION_LOG%" 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Get-Content -LiteralPath $env:VALIDATION_LOG -Tail 40"
  goto :failed
)
findstr /C:"Summary:" "%VALIDATION_LOG%"

echo.
echo [3/3] Updating the deployment mirror and opening balance mode...
if exist "%MIRROR_DIR%\index.html" (
  copy /Y "assets\data\generated\game-data.generated.js" "%MIRROR_DIR%\assets\data\generated\game-data.generated.js" >nul
  if errorlevel 1 goto :failed
  copy /Y "docs\generated\DATA_TABLE_SYNC_REPORT.md" "%MIRROR_DIR%\docs\generated\DATA_TABLE_SYNC_REPORT.md" >nul
  if errorlevel 1 goto :failed
)

if /I not "%BALANCE_NO_LAUNCH%"=="1" (
  if exist "%~dp0index.html" (
    start "" "%~dp0index.html"
  ) else (
    echo [WARN] index.html not found next to this script. Skipping auto-open.
  )
)

echo.
echo Done. The latest Sheet balance data is ready.
exit /b 0

:failed
echo.
echo Stopped. Fix the error above and run this file again.
pause
exit /b 1