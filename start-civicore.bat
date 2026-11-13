@echo off
REM Starts the CiviCORE Laravel and frontend development services.
setlocal

title CiviCORE Control Center
echo ===================================================
echo   CiviCORE: Starting All Systems (V4 Queue Profiles)...
echo ===================================================
echo.

:: -----------------------------------------------------------------
:: Laragon / Apache pre-flight check — fail fast if not installed.
:: -----------------------------------------------------------------
set "HTTPD_EXE=C:\laragon\bin\apache\httpd-2.4.68-260617-Win64-VS18\bin\httpd.exe"
if not exist "%HTTPD_EXE%" (
    echo.
    echo   [ERROR] Laragon Apache not found at:
    echo   %HTTPD_EXE%
    echo.
    echo   Please start Laragon first, then re-run this script.
    echo.
    pause >nul
    exit /b 1
)

:: Check if Apache is already running (avoid duplicate start)
"%HTTPD_EXE%" -k query -n httpd >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [INFO] Apache is already running. Skipping start.
) else (
    echo   [INFO] Starting Apache...
)

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

:: 2. Start PHP Laravel Server via Apache (mod_php) — faster than artisan serve
echo [2/5] Launching Laravel Server on http://localhost:80 (Apache + mod_php)...
start "Laravel Server" cmd /k "title Laravel Server && cd /d C:\laragon\bin\apache\httpd-2.4.68-260617-Win64-VS18\bin && httpd.exe -k start -n httpd"

:: 3. Start Laravel Queue Listener (single process, all queues)
echo [3/5] Launching Laravel Queue Listener...
start "Queue Listener" cmd /k "cd /d C:\laragon\www\civicore_laravel && php artisan queue:work --queue=low,ocr,default"

:: 4. Start Persistent OCR Server
echo [4/5] Launching Persistent OCR Server (FastAPI + Dynamic Scaling)...
start "OCR Server" cmd /k "scripts\serve-ocr.bat"

:: 5. Start Vite (Frontend) - prompt for dev or build
echo [5/5] Choose Vite mode:
echo   [1] Dev Server (Hot Module Replacement, instant updates)
echo   [2] Build (production build, no HMR)
echo.
choice /C 12 /T 20 /D 2 /M "Enter choice (1=Dev, 2=Build, default 2 (Build) in 20s): "
if %ERRORLEVEL% EQU 2 set "VITE_CMD=npm run build"
if %ERRORLEVEL% EQU 1 set "VITE_CMD=npm run dev"

echo [5/5] Launching Vite with: %VITE_CMD%
echo.
echo   ============================================================
echo   YOUR NETWORK ACCESS (also shown in Vite window title):
echo   ------------------------------------------------------------
echo   Local PC:      http://localhost:8000
echo   Mobile/Phone:  http://%PC_IP%:8000
echo   (For HTTPS camera access, run start-tunnel.bat)
echo   ============================================================
echo.

start "Vite [%PC_IP%]" cmd /k "title Vite Server - Mobile: http://%PC_IP%:8000 && echo. && echo Running: %VITE_CMD% && echo Network IP: %PC_IP% && echo. && %VITE_CMD%"

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
echo   [SHUTDOWN] Type 'x' to exit all CiviCORE services and close all windows.
echo ===================================================

:wait_for_x
set "SHUTDOWN_INPUT="
set /p "SHUTDOWN_INPUT=Type 'x' to shutdown: "
if /I not "%SHUTDOWN_INPUT%"=="x" goto wait_for_x

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

echo [*] Stopping Laravel Server (Apache)...
"C:\laragon\bin\apache\httpd-2.4.68-260617-Win64-VS18\bin\httpd.exe" -k stop -n httpd >nul 2>&1
taskkill /FI "WINDOWTITLE eq Laravel Server*" /T /F >nul 2>&1

echo [*] Stopping Vite Dev Server...
taskkill /FI "WINDOWTITLE eq Vite Dev*" /T /F >nul 2>&1

echo.
echo ===================================================
echo   All CiviCORE services have been successfully closed!
echo ===================================================
ping 127.0.0.1 -n 3 >nul
exit