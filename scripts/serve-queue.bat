@echo off
:retry
title CiviCORE Queue Worker
echo Running CiviCORE Queue Worker (queues: high, default, low)...
php artisan queue:work --queue=high,default,low --tries=3 --sleep=1 --timeout=1200
echo Queue worker exited, restarting in 3s...
timeout /t 3 /nobreak >nul
goto :retry