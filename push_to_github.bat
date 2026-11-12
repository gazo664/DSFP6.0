@echo off
title Push JobTrack to GitHub
cd /d "%~dp0"

echo ========================================================
echo              Pushing JobTrack to GitHub
echo     Target: https://github.com/gazo664/DSFP6.0.git
echo ========================================================
echo.

set GIT_CMD="C:\Users\DELL 7410\AppData\Local\Programs\Git\cmd\git.exe"

%GIT_CMD% status
echo.
echo Pushing branch 'main' to origin...
echo (If prompted by GitHub, choose 'Sign in with your browser' or paste your GitHub Personal Access Token)
echo.

%GIT_CMD% push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo  [SUCCESS] Code successfully pushed to GitHub!
    echo  View repository: https://github.com/gazo664/DSFP6.0
    echo ========================================================
) else (
    echo ========================================================
    echo  [NOTE] If authentication is needed:
    echo  1. Use your GitHub Personal Access Token as the password
    echo     (Create one at https://github.com/settings/tokens)
    echo  2. Or sign in with your GitHub browser prompt.
    echo ========================================================
)
echo.
pause

