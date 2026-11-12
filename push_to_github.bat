@echo off
title Push JobTrack to GitHub
cd /d "%~dp0"

:: Set Git and GCM in PATH
set "PATH=C:\Users\DELL 7410\AppData\Local\Programs\Git\cmd;C:\Users\DELL 7410\AppData\Local\Programs\Git\ucrt64\bin;%PATH%"

cls
echo ======================================================================
echo                 JOBTRACK - PUSH TO GITHUB REPOSITORY
echo       Target: https://github.com/gazo664/DSFP6.0.git
echo ======================================================================
echo.
echo Current branch: main
echo Status: Staged and committed.
echo.
echo Running: git push -u origin main ...
echo.
echo (A GitHub login window or browser prompt will open to authorize access)
echo.

git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================================
    echo   [SUCCESS] Code successfully pushed to GitHub!
    echo   View repository: https://github.com/gazo664/DSFP6.0
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo   Push paused or needs authorization.
    echo   If you have a Personal Access Token (PAT), paste it below to push:
    echo ======================================================================
    set /p token="GitHub Token (or press Enter to cancel): "
    if not "!token!"=="" (
        git remote set-url origin https://!token!@github.com/gazo664/DSFP6.0.git
        git push -u origin main
        git remote set-url origin https://github.com/gazo664/DSFP6.0.git
    )
)

echo.
pause
