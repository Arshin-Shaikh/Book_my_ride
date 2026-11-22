#!/bin/bash

# Ride Booking App - Installation Script

echo "Ride Booking App - Installation Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "[INFO] Node.js version: $(node -v)"
echo "[INFO] npm version: $(npm -v)"
echo ""

# Install backend dependencies
echo "[INFO] Installing backend dependencies..."
cd backend
npm install

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Backend dependencies installed successfully!"
else
    echo "[ERROR] Failed to install backend dependencies"
    exit 1
fi

echo ""

# Install frontend dependencies
echo "[INFO] Installing frontend dependencies..."
cd ../frontend
npm install

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Frontend dependencies installed successfully!"
else
    echo "[ERROR] Failed to install frontend dependencies"
    exit 1
fi

cd ..

echo ""
echo "[SUCCESS] Installation Complete!"
echo ""
echo "Next Steps:"
echo "1. Configure MongoDB URL in backend/.env"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm start"
echo ""
