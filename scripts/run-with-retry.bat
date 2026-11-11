@echo off
REM Generic retry wrapper - runs a command and restarts it if it exits with an error.
REM Usage: run-with-retry.bat [command] [args...]
:retry
%*
if %ERRORLEVEL% NEQ 0 (
    echo [%~n0] Crashed, restarting in 3s...
    timeout /t 3 /nobreak >nul
    goto :retry
)