@echo off
REM Start the monument-valley server in the background and exit immediately.
REM Logs go to ..\logs\valley.out.log / valley.err.log
setlocal
set HERE=%~dp0
set SERVER=%HERE%..\valley\server
set LOGS=%HERE%..\logs
if not exist "%LOGS%" mkdir "%LOGS%"
if not exist "%SERVER%\.env" (
  echo [WARN] %SERVER%\.env not found - JWT_SECRET is required.
  echo        Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
)
pushd "%SERVER%"
start "" /B node --env-file=.env index.js 1>>"%LOGS%\valley.out.log" 2>>"%LOGS%\valley.err.log"
popd
echo Started. Open http://127.0.0.1:3001
