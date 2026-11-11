@echo off
REM Start Redis server in background
start /b "" "C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-server.exe" --port 6379 --dir "C:\laragon\bin\redis\redis-x64-5.0.14.1"
timeout /t 2 /nobreak >nul
"C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-cli.exe" -p 6379 ping