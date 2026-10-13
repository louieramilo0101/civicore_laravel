@echo off
REM Starts the CiviCORE Laravel and frontend development services.
setlocal

title CiviCORE Control Center
echo ===================================================
echo   CiviCORE: Starting All Systems (V4 Queue Profiles)...
echo ===================================================
echo.
echo ===================================================
echo   [YOUR NETWORK IP ADDRESSES FOR OTHER DEVICES / PHONES]
echo   ---------------------------------------------------
ipconfig | findstr /i "IPv4 Address Ethernet Wireless Wi-Fi Adapter"
echo   ---------------------------------------------------
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

:: Detect Local IP Address
set "PC_IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4 Address"') do (
    set "PC_IP=%%a"
    goto :found_ip
)
:found_ip
if defined PC_IP set "PC_IP=%PC_IP:~1%"

:: Detect Ollama Executable
set "OLLAMA_BIN=ollama"
where ollama >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        set "OLLAMA_BIN=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    )
)

:: 1. Start Ollama Server (Local AI & Offline Vision OCR)
echo [1/5] Launching Ollama Server (Local AI / Vision OCR)...
start "Ollama Server" cmd /k "title Ollama Server && echo Starting Ollama on port 11434... && "%OLLAMA_BIN%" serve"

:: 2. Start PHP Laravel Server
echo [2/5] Launching Laravel Server on http://0.0.0.0:8000...
start "Laravel Server" cmd /k "title Laravel Server && php artisan serve --host 0.0.0.0"

:: 3. Start Unified Laravel Queue Worker
echo [3/5] Launching Unified Laravel Queue Worker (high, default, low)...
start "CiviCORE Queue Worker" cmd /k "title CiviCORE Queue Worker && echo Running CiviCORE Queue Worker (queues: high, default, low)... && php artisan queue:work --queue=high,default,low --tries=3 --sleep=1 --timeout=1200"

:: 4. Start Persistent OCR Server
echo [4/5] Launching Persistent OCR Server (FastAPI + Dynamic Scaling)...
start "OCR Server" cmd /k "title OCR Server && C:\laragon\bin\python\python-3.13\python.exe ocr_server.py"

:: 5. Start Vite (Frontend)
set "START_VITE=y"
echo [5/5] Do you want to run Vite Dev Server for hot-reloading? (y/n)
set /p START_VITE="Enter choice (y/n, default y): "
if /I "%START_VITE%"=="n" (
    echo Bypassing Vite Dev Server (Running in Production Mode).
    if exist public\hot del public\hot
) else (
    echo Launching Vite Frontend (npm run dev)...
    start "Vite Dev" cmd /k "title Vite Dev && npm run dev"
)

echo ===================================================
echo   ALL SYSTEMS GO!
echo   1. Check the "Ollama Server" window to verify local AI status.
echo   2. Wait for "OCR Reader ready" in the OCR window.
echo   3. If running dev mode, wait for "VITE ready" in the Vite window.
echo.
echo   [NETWORK IP ADDRESSES FOR OTHER DEVICES / PHONES]
echo   ---------------------------------------------------
ipconfig | findstr /i "IPv4 Address Ethernet Wireless Wi-Fi Adapter"
echo   ---------------------------------------------------
echo   * Visit on Local PC:       http://localhost:8000
echo   * Visit on Mobile Phone:   http://%PC_IP%:8000
echo   (If connected via Wi-Fi, type the IPv4 address above followed by :8000)
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
