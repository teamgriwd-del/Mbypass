#!/usr/bin/env bash
set -e

echo "==> Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q

echo "==> Starting backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "==> Seeding demo data..."
sleep 3
python seed.py

echo "==> Installing frontend dependencies..."
cd ../frontend

npm install --silent

echo "==> Starting frontend..."
npm run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "MBypass is running:"
echo "  Backend API : http://localhost:8000"
echo "  Frontend    : http://localhost:5173"
echo "  API Docs    : http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
