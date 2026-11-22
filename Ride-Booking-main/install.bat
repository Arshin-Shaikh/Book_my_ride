@echo off
REM Ride Booking App - Installation Script for Windows

echo Ride Booking App - Installation Script
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo [INFO] Node.js installed
node -v
echo [INFO] npm installed
npm -v
echo.

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
cd backend
call npm install

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backend dependencies installed successfully!
) else (
    echo [ERROR] Failed to install backend dependencies
    exit /b 1
)

echo.

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
cd ..\frontend
call npm install

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Frontend dependencies installed successfully!
) else (
    echo [ERROR] Failed to install frontend dependencies
    exit /b 1
)

cd ..

echo.
echo [SUCCESS] Installation Complete!
echo.
echo Next Steps:
echo 1. Configure MongoDB URL in backend\.env
echo 2. Start backend: cd backend ^&^& npm run dev
echo 3. Start frontend: cd frontend ^&^& npm start
echo.

pause
