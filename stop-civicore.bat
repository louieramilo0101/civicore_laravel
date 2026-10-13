@echo off
REM CiviCORE: Cleanly shuts down all services and background processes.
setlocal

title CiviCORE Shutdown
echo ===================================================
echo   CiviCORE: Shutting Down All Running Services...
echo ===================================================

echo [*] Stopping Ollama Server...
taskkill /FI "WINDOWTITLE eq Ollama Server*" /T /F >nul 2>&1
taskkill /F /IM ollama.exe >nul 2>&1
taskkill /F /IM ollama_llama_server.exe >nul 2>&1

echo [*] Stopping Persistent OCR Server...
taskkill /FI "WINDOWTITLE eq OCR Server*" /T /F >nul 2>&1

echo [*] Stopping Laravel Queue Workers...
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
