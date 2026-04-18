@echo off
title DjonStNix Discord Bot
setlocal

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================================
    echo ❌ ERROR: Node.js Engine Not Found!
    echo ========================================================
    echo The bot needs Node.js to run. Downloading the installer for you...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi' -OutFile '%TEMP%\node_installer.msi'"
    echo.
    echo Launching installer... Please click through the setup window.
    start /wait msiexec /i "%TEMP%\node_installer.msi"
    echo.
    echo ✅ Installation Finished!
    echo ⚠️ IMPORTANT: You MUST close this window and double-click run.bat again to refresh!
    pause
    exit /b
)

echo 🔍 Downloading local bot dependencies...
call npm install

echo 🚀 Registering new Slash Commands to Discord...
node deploy-commands.js

echo 🤖 Starting DjonStNix Bot Backend...
node index.js
pause
