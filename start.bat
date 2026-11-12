@echo off
title JobTrack - Job Tracking System
cd /d "%~dp0"

echo ========================================================
echo         JobTrack - Job Tracking Application
echo              (Light Blue Theme)
echo ========================================================
echo.

set PYTHON_CMD=

:: Check known working Python 3.12 location first
if exist "C:\Program Files\QGIS 3.44.0\apps\Python312\python.exe" (
    set "PYTHON_CMD=C:\Program Files\QGIS 3.44.0\apps\Python312\python.exe"
    goto :run
)

:: Check if standard python works
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
    goto :run
)

:: Check if py launcher works
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py"
    goto :run
)

echo [ERROR] No working Python 3 installation found on your system.
echo Please install Python 3.8+ or ensure it is added to your PATH.
pause
exit /b 1

:run
echo [INFO] Using Python: %PYTHON_CMD%
echo [INFO] Starting server at http://127.0.0.1:8000 ...
start "" http://127.0.0.1:8000
"%PYTHON_CMD%" app.py
pause

