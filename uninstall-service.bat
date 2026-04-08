@echo off
echo === Yamaha Alexa Bridge - Service Uninstaller ===
echo.
echo This script must be run as Administrator.
echo.

where nssm >nul 2>&1
if errorlevel 1 (
    echo ERROR: nssm.exe not found in PATH.
    pause
    exit /b 1
)

echo Stopping service...
nssm stop YamahaAlexaBridge

echo Removing service...
nssm remove YamahaAlexaBridge confirm

echo.
echo Service removed.
echo.
pause
