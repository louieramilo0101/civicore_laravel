@echo off
REM Starts the CiviCORE Laravel and frontend development services.
setlocal

title CiviCORE Control Center
echo ===================================================
echo   CiviCORE: Starting All Systems (V4 Queue Profiles)...
echo ===================================================
echo.

:: -----------------------------------------------------------------
:: Queue profile selection
:: Set RAM_PROFILE to 4GB for low-memory machines.
:: Keep 8GB_PLUS for 8GB+ RAM machines.
:: -----------------------------------------------------------------
set "RAM_PROFILE=8GB_PLUS"
set /a CPU_CORES=%NUMBER_OF_PROCESSORS%

if /I "%RAM_PROFILE%"=="4GB" (
    set "HIGH_WORKERS=1"
    set "LOW_WORKERS=1"
    set "DEFAULT_WORKERS=1"
    set "HIGH_SLEEP=1"
    set "LOW_SLEEP=2"
    set "DEFAULT_SLEEP=3"
    set "HIGH_TIMEOUT=120"
    set "LOW_TIMEOUT=900"
    set "DEFAULT_TIMEOUT=90"
) else (
    set "HIGH_WORKERS=1"
    set "LOW_WORKERS=1"
    set "DEFAULT_WORKERS=1"
    set "HIGH_SLEEP=1"
    set "LOW_SLEEP=1"
    set "DEFAULT_SLEEP=2"
    set "HIGH_TIMEOUT=120"
    set "LOW_TIMEOUT=1200"
    set "DEFAULT_TIMEOUT=90"
)

:: CPU-aware safety cap for low queue fan-out workers.
if %CPU_CORES% LEQ 4 set "LOW_WORKERS=1"

:: Detect Local IP Address - more robust method
set "PC_IP=localhost"
for /f "tokens=2 delims=[]" %%a in ('ping -n 1 -4 "%COMPUTERNAME%" ^| findstr "["') do (
    set "PC_IP=%%a"
)
if "%PC_IP%"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4 Address"') do (
        set "PC_IP=%%a"
        goto :found_ip
    )
    :found_ip
    if defined PC_IP set "PC_IP=%PC_IP:~1%"
)

:: Detect Ollama Executable
set "OLLAMA_BIN=ollama"
where ollama >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        set "OLLAMA_BIN=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    )
)

:: 0. Start Redis Server
echo [0/5] Launching Redis Server...
start /b "" "C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-server.exe" --port 6379 --dir "C:\laragon\bin\redis\redis-x64-5.0.14.1"
timeout /t 2 /nobreak >nul

:: 1. Start Ollama Server (Local AI & Offline Vision OCR)
echo [1/5] Launching Ollama Server (Local AI / Vision OCR)...
start "Ollama Server" cmd /k "scripts\serve-ollama.bat"

:: 2. Start PHP Laravel Server
echo [2/5] Launching Laravel Server on http://0.0.0.0:8000...
start "Laravel Server" cmd /k "title Laravel Server && php artisan serve --host 0.0.0.0"

:: 3. Start Unified Laravel Queue Worker
echo [3/5] Launching Unified Laravel Queue Worker (high, default, low)...
start "CiviCORE Queue Worker" cmd /k "scripts\serve-queue.bat"

:: 4. Start Persistent OCR Server
echo [4/5] Launching Persistent OCR Server (FastAPI + Dynamic Scaling)...
start "OCR Server" cmd /k "scripts\serve-ocr.bat"

:: 5. Start Vite (Frontend) - ALWAYS run dev server for HMR
echo [5/5] Launching Vite Dev Server with Hot Module Replacement...
echo.
echo   ============================================================
echo   YOUR NETWORK ACCESS (also shown in Vite window title):
echo   ------------------------------------------------------------
echo   Local PC:      http://localhost:8000
echo   Mobile/Phone:  http://%PC_IP%:8000
echo   (For HTTPS camera access, run start-tunnel.bat)
echo   ============================================================
echo.

start "Vite Dev [%PC_IP%]" cmd /k "title Vite Dev Server - Mobile: http://%PC_IP%:8000 && echo. && echo Vite Dev Server with HMR && echo Network IP: %PC_IP% && echo. && npm run dev"

echo ===================================================
echo   ALL SYSTEMS GO!
echo   1. Check the "Ollama Server" window to verify local AI status.
echo   2. Wait for "OCR Reader ready" in the OCR window.
echo   3. Wait for "VITE ready" in the Vite window.
echo   4. The Vite window title shows your mobile IP: %PC_IP%
echo.
echo   [NETWORK IP ADDRESSES FOR OTHER DEVICES / PHONES]
echo   ---------------------------------------------------
ipconfig | findstr /i "IPv4 Address Ethernet Wireless Wi-Fi Adapter"
echo   ---------------------------------------------------
echo   * Visit on local PC:       http://localhost:8000
echo   * Visit on mobile phone:   http://%PC_IP%:8000
echo   (For full mobile camera WebRTC access over HTTPS, run start-tunnel.bat)
echo ===================================================
echo.
echo ===================================================
echo   [SHUTDOWN] Press ANY KEY in this window to STOP
echo              all CiviCORE services and close all windows.
echo ===================================================
pause >nul

echo.
echo ===================================================
echo   Stopping all CiviCORE services and closing windows...
echo ===================================================

echo [*] Stopping Redis Server...
taskkill /F /IM redis-server.exe >nul 2>&1

echo [*] Stopping Ollama Server...
taskkill /FI "WINDOWTITLE eq Ollama Server*" /T /F >nul 2>&1
taskkill /F /IM ollama.exe >nul 2>&1
taskkill /F /IM ollama_llama_server.exe >nul 2>&1

echo [*] Stopping Persistent OCR Server...
taskkill /FI "WINDOWTITLE eq OCR Server*" /T /F >nul 2>&1

echo [*] Stopping Laravel Queue Workers...
taskkill /FI "WINDOWTITLE eq CiviCORE Queue Worker*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Queue High*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Queue Low*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Queue Default*" /T /F >nul 2>&1

echo [*] Stopping Laravel Server...
taskkill /FI "WINDOWTITLE eq Laravel Server*" /T /F >nul 2>&1

echo [*] Stopping Vite Dev Server...
taskkill /FI "WINDOWTITLE eq Vite Dev*" /T /F >nul 2>&1

echo.
echo ===================================================
echo   All CiviCORE services have been successfully closed!
echo ===================================================
ping 127.0.0.1 -n 3 >nul
exit