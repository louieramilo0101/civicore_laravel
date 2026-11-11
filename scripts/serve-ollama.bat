@echo off
:retry
title Ollama Server
echo Starting Ollama on port 11434...
ollama serve
echo Ollama exited, restarting in 3s...
timeout /t 3 /nobreak >nul
goto :retry