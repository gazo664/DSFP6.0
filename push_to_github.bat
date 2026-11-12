@echo off
title Push JobTrack to GitHub
cd /d "%~dp0"
setlocal enabledelayedexpansion

set GIT="C:\Users\DELL 7410\AppData\Local\Programs\Git\cmd\git.exe"

cls
echo ======================================================================
echo                 JOBTRACK - PUSH TO GITHUB REPOSITORY
echo       Target: https://github.com/gazo664/DSFP6.0.git
echo ======================================================================
echo.
echo Current branch: main
echo Ready to push commit history to GitHub.
echo.
echo Select an authentication method:
echo   [1] Browser Login (Sign in via GitHub Web Browser prompt)
echo   [2] Paste GitHub Personal Access Token (PAT)
echo   [3] Exit
echo.
set /p choice="Enter choice [1, 2, or 3]: "

if "%choice%"=="1" (
    echo.
    echo [INFO] Initiating push with Git Credential Manager...
    echo (A browser window will appear requesting your GitHub approval)
    echo.
    %GIT% push -u origin main
    goto :done
)

if "%choice%"=="2" (
    echo.
    echo To create a GitHub Token:
    echo 1. Open: https://github.com/settings/tokens/new
    echo 2. Check the 'repo' scope and click 'Generate token'
    echo.
    set /p token="Paste your GitHub Personal Access Token: "
    if "!token!"=="" (
        echo [ERROR] Token cannot be empty.
        pause
        exit /b 1
    )
    echo.
    echo [INFO] Pushing using Personal Access Token...
    %GIT% remote set-url origin https://!token!@github.com/gazo664/DSFP6.0.git
    %GIT% push -u origin main
    %GIT% remote set-url origin https://github.com/gazo664/DSFP6.0.git
    goto :done
)

if "%choice%"=="3" (
    exit /b 0
)

:done
echo.
if %errorlevel% equ 0 (
    echo ======================================================================
    echo   [SUCCESS] Your code is successfully published to GitHub!
    echo   Check it out: https://github.com/gazo664/DSFP6.0
    echo ======================================================================
) else (
    echo ======================================================================
    echo   [NOTICE] Push did not complete. If you received an authentication
    echo   error, please try Option 2 with a Personal Access Token.
    echo ======================================================================
)
echo.
pause
