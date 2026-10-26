@echo off
setlocal
set LOG=%~dp0..\logs\health-check.log
if not exist "%~dp0..\logs" mkdir "%~dp0..\logs"
echo ===== %date% %time% ===== >> "%LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0health-check.ps1" >> "%LOG%" 2>&1