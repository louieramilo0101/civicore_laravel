@echo off
REM Starts an HTTPS tunnel (Localtunnel or Cloudflare) to securely connect mobile phones or cloud deployments to your local backend with full camera permissions.
setlocal

title CiviCORE HTTPS Tunnel Gateway
echo ===================================================
echo   CiviCORE: Starting Secure HTTPS Tunnel Gateway
echo   Provides secure HTTPS for mobile camera access
echo ===================================================
echo.

echo Choose tunnel provider:
echo   [1] Localtunnel (npx localtunnel --port 8000) - Recommended for Phone Camera
echo   [2] Cloudflare Quick Tunnel (cloudflared)
echo.
set /p TUNNEL_CHOICE="Enter option (1 or 2, default 1): "

if "%TUNNEL_CHOICE%"=="2" goto :cloudflare

:localtunnel
echo.
echo [*] Starting Localtunnel for http://localhost:8000...
echo ============================================================================
echo   MOBILE CAMERA INSTRUCTIONS:
echo   1. Copy the https://xxxx.loca.lt URL generated below.
echo   2. Open that URL on your mobile phone browser (Chrome/Safari).
echo   3. If prompted by Localtunnel, enter your external IP to proceed.
echo   4. Camera WebRTC live streaming will work securely over HTTPS!
echo ============================================================================
echo.
npx localtunnel --port 8000
pause
exit /b

:cloudflare
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
echo   2. Open this HTTPS URL on your phone for secure camera access.
echo ============================================================================
echo.

cloudflared tunnel --url http://localhost:8000
pause
