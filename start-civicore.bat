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

:: 1. Start PHP Laravel Server
echo [1/4] Launching Laravel Server on http://0.0.0.0:8000...
start "Laravel Server" cmd /k "php artisan serve --host 0.0.0.0"

:: 2. Start Laravel Queue Workers (Queue-Specific)
echo [2/4] Launching dedicated queue workers (high, low, default)...
echo      Profile: %RAM_PROFILE% ^| CPU cores detected: %CPU_CORES%

for /L %%i in (1,1,%HIGH_WORKERS%) do (
    start "Queue High %%i" cmd /k "php artisan queue:work --queue=high --tries=3 --sleep=%HIGH_SLEEP% --timeout=%HIGH_TIMEOUT%"
)

for /L %%i in (1,1,%LOW_WORKERS%) do (
    start "Queue Low %%i" cmd /k "php artisan queue:work --queue=low --tries=3 --sleep=%LOW_SLEEP% --timeout=%LOW_TIMEOUT%"
)

for /L %%i in (1,1,%DEFAULT_WORKERS%) do (
    start "Queue Default %%i" cmd /k "php artisan queue:work --queue=default --tries=3 --sleep=%DEFAULT_SLEEP% --timeout=%DEFAULT_TIMEOUT%"
)

:: 3. Start Persistent OCR Server
echo [3/4] Launching Persistent OCR Server (FastAPI + Dynamic Scaling)...
start "OCR Server" cmd /k "C:\laragon\bin\python\python-3.13\python.exe ocr_server.py"

:: 4. Start Vite (Frontend)
set "START_VITE=y"
echo [4/4] Do you want to run Vite Dev Server for hot-reloading? (y/n)
set /p START_VITE="Enter choice (y/n, default y): "
if /I "%START_VITE%"=="n" (
    echo Bypassing Vite Dev Server (Running in Production Mode).
    if exist public\hot del public\hot
) else (
    echo Launching Vite Frontend (npm run dev)...
    start "Vite Dev" cmd /k "npm run dev"
)

echo ===================================================
echo   ALL SYSTEMS GO!
echo   1. Wait for "OCR Reader ready" in the OCR window.
echo   2. If running dev mode, wait for "VITE ready" in the Vite window.
echo.
echo   [NETWORK IP ADDRESSES FOR OTHER DEVICES / PHONES]
echo   ---------------------------------------------------
ipconfig | findstr /i "IPv4 Address Ethernet Wireless Wi-Fi Adapter"
echo   ---------------------------------------------------
echo   * Visit on Local PC:       http://localhost:8000
echo   * Visit on Mobile Phone:   http://%PC_IP%:8000
echo   (If connected via Wi-Fi, type the IPv4 address above followed by :8000)
echo ===================================================
pause
