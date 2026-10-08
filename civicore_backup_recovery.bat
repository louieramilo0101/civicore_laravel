@echo off
setlocal enabledelayedexpansion
title CiviCORE Backup & Disaster Recovery Tool

:: Locate PHP binary
set "PHP_BIN=php"
if exist "C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe" (
    set "PHP_BIN=C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe"
)

:MENU
cls
echo =====================================================================
echo                CIVICORE BACKUP ^& DISASTER RECOVERY
echo =====================================================================
echo  Private ^& Compressed System Backup Tool (Database + Attachments)
echo =====================================================================
echo.
echo  [1] Create Immediate System Backup
echo  [2] List All Existing Backups
echo  [3] Restore System From a Backup (with Safety Rollback)
echo  [4] Prune Expired Backups (Retention Policy)
echo  [5] Exit
echo.
echo =====================================================================
set /p choice="Enter option [1-5]: "

if "%choice%"=="1" goto RUN_BACKUP
if "%choice%"=="2" goto LIST_BACKUPS
if "%choice%"=="3" goto RESTORE_BACKUP
if "%choice%"=="4" goto PRUNE_BACKUPS
if "%choice%"=="5" goto EXIT_TOOL
goto INVALID_CHOICE

:RUN_BACKUP
cls
echo ---------------------------------------------------------------------
echo  CREATING SYSTEM BACKUP...
echo ---------------------------------------------------------------------
echo.
"%PHP_BIN%" artisan backup:run --type=manual
echo.
pause
goto MENU

:LIST_BACKUPS
cls
echo ---------------------------------------------------------------------
echo  EXISTING CIVICORE BACKUPS:
echo ---------------------------------------------------------------------
echo.
"%PHP_BIN%" artisan backup:list
echo.
pause
goto MENU

:RESTORE_BACKUP
cls
echo ---------------------------------------------------------------------
echo  SYSTEM RESTORATION (POINT-IN-TIME RECOVERY)
echo ---------------------------------------------------------------------
echo.
echo  Existing available archives:
"%PHP_BIN%" artisan backup:list
echo.
echo  NOTE: The system will automatically generate an Automatic Safety Copy
echo        of your current live data before restoring, so this can be undone.
echo.
set /p backup_file="Enter the exact filename to restore (e.g. civicore_manual_...zip): "
if "%backup_file%"=="" (
    echo No filename entered. Operation cancelled.
    pause
    goto MENU
)

echo.
"%PHP_BIN%" artisan backup:restore "%backup_file%"
echo.
pause
goto MENU

:PRUNE_BACKUPS
cls
echo ---------------------------------------------------------------------
echo  CLEANING UP EXPIRED BACKUPS ACCORDING TO RETENTION SCHEDULE...
echo ---------------------------------------------------------------------
echo.
"%PHP_BIN%" artisan backup:prune
echo.
pause
goto MENU

:INVALID_CHOICE
echo Invalid choice. Please select 1 to 5.
pause
goto MENU

:EXIT_TOOL
echo Exiting CiviCORE Recovery Tool.
exit /b 0
