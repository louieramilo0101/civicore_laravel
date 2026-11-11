@echo off
:retry
title OCR Server
echo Starting Persistent OCR Server (FastAPI)...
C:\laragon\bin\python\python-3.13\python.exe ocr_server.py
echo OCR server exited, restarting in 3s...
timeout /t 3 /nobreak >nul
goto :retry