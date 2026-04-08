@echo off
echo === Yamaha Alexa Bridge - Service Installer ===
echo.
echo This script must be run as Administrator.
echo It will install the bridge as a Windows service that starts automatically on boot.
echo.

where nssm >nul 2>&1
if errorlevel 1 (
    echo ERROR: nssm.exe not found in PATH.
    echo.
    echo Download NSSM from https://nssm.cc/download and either:
    echo   1. Place nssm.exe in this folder, OR
    echo   2. Add its location to your system PATH
    echo.
    pause
    exit /b 1
)

set SCRIPT_DIR=%~dp0
set NODE_PATH=
for /f "delims=" %%i in ('where node') do set NODE_PATH=%%i

if "%NODE_PATH%"=="" (
    echo ERROR: Node.js not found. Install it from https://nodejs.org
    pause
    exit /b 1
)

echo Installing service...
nssm install YamahaAlexaBridge "%NODE_PATH%" "%SCRIPT_DIR%index.js"
nssm set YamahaAlexaBridge AppDirectory "%SCRIPT_DIR%"
nssm set YamahaAlexaBridge DisplayName "Yamaha Alexa Bridge"
nssm set YamahaAlexaBridge Description "Control Yamaha MusicCast receivers with Alexa via Sinric Pro"
nssm set YamahaAlexaBridge Start SERVICE_AUTO_START
nssm set YamahaAlexaBridge AppStdout "%SCRIPT_DIR%service.log"
nssm set YamahaAlexaBridge AppStderr "%SCRIPT_DIR%service.log"
nssm set YamahaAlexaBridge AppRotateFiles 1
nssm set YamahaAlexaBridge AppRotateBytes 1048576

echo Starting service...
nssm start YamahaAlexaBridge

echo.
echo Done! The "Yamaha Alexa Bridge" service is now running.
echo Check service.log in this folder for output.
echo.
pause
