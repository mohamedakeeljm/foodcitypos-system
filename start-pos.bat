@echo off
title Supermarket POS Express Launcher
echo ===================================================
echo Starting Supermarket POS Express (Single Counter)...
echo ===================================================
cd /d "%~dp0"

:: Start local backend server in background
start /b cmd /c "node server/index.js"

:: Start desktop frontend via electron
npm run electron:start

pause
