@echo off
echo Detecting local IPv4 address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4 Address"') do set IP=%%a
set IP=%IP:~1%
echo Your IP: %IP%
if "%IP%"=="" (
    echo ERROR: Could not detect IP address.
    exit /b 1
)
echo Updating APP_URL to http://%IP%...
findstr /v "APP_URL=" .env > .env.tmp
echo APP_URL=http://%IP%>> .env.tmp
move /y .env.tmp .env >nul
echo Done. Your phone can now access: http://%IP%
pause