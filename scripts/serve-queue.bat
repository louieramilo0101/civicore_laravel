@echo off
REM This script is called by start-civicore.bat which starts multiple workers in separate windows.
REM Do NOT run directly — it only launches one worker based on %QUEUE_TYPE%.

set QUEUE_TYPE=%1
if "%QUEUE_TYPE%"=="" set QUEUE_TYPE=default

if "%QUEUE_TYPE%"=="high" (
    title Queue High
    echo Running HIGH priority queue worker...
    php artisan queue:work --queue=high --tries=3 --sleep=1 --timeout=120 --max-jobs=500 --memory=512
) else if "%QUEUE_TYPE%"=="low" (
    title Queue Low
    echo Running LOW priority queue worker...
    php artisan queue:work --queue=low --tries=3 --sleep=3 --timeout=90 --max-jobs=200 --memory=512
) else if "%QUEUE_TYPE%"=="ocr" (
    title Queue OCR
    echo Running OCR queue worker (dedicated, long timeout)...
    php artisan queue:work --queue=ocr --tries=3 --sleep=2 --timeout=1200 --max-jobs=50 --memory=1024
) else (
    title Queue Default
    echo Running DEFAULT queue worker...
    php artisan queue:work --queue=default --tries=3 --sleep=2 --timeout=90 --max-jobs=300 --memory=512
)

echo Queue worker exited, restarting in 3s...
timeout /t 3 /nobreak >nul
goto :retry