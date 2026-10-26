@echo off
REM Starts a Cloudflare Quick Tunnel to securely connect Vercel to your local Laragon Laravel backend.
setlocal

title CiviCORE Cloudflare Tunnel Gateway
echo ===================================================
echo   CiviCORE: Starting Cloudflare Tunnel Gateway
echo   Plan A: Local Laravel Backend ^<--^> Vercel Cloud
echo ===================================================
echo.

where cloudflared >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Cloudflare Tunnel CLI (cloudflared) is not found in PATH.
    echo.
    echo You can install it quickly using winget:
    echo     winget install --id Cloudflare.cloudflared -e
    echo.
    echo Or download cloudflared.exe from:
    echo     https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    echo.
    set /p INSTALL_NOW="Would you like to install cloudflared now using winget? (y/n): "
    if /I "%INSTALL_NOW%"=="y" (
        winget install --id Cloudflare.cloudflared -e
        echo Please restart this script after the installer completes.
        pause
        exit /b
    ) else (
        echo Please place cloudflared.exe in your PATH or in this folder.
        pause
        exit /b
    )
)

echo [*] Starting Cloudflare Quick Tunnel for http://localhost:8000...
echo.
echo ============================================================================
echo   IMPORTANT INSTRUCTIONS:
echo   1. Cloudflare will output a public HTTPS address ending in:
echo      https://xxxx-xxxx.trycloudflare.com
echo.
echo   2. Copy that URL and paste it into your Vercel Project Settings:
echo      Environment Variable: VITE_API_BASE_URL = https://xxxx-xxxx.trycloudflare.com
echo.
echo   3. Also add it to your local .env if you wish:
echo      PUBLIC_PORTAL_URL = https://your-app.vercel.app
echo ============================================================================
echo.

cloudflared tunnel --url http://localhost:8000
pause
