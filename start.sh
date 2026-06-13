#!/bin/bash

echo "🚀 Starting CrimePredict full stack..."

#####################################
# 0. KILL OLD PROCESSES (IMPORTANT)
#####################################

echo "🧹 Cleaning old processes on port 8000..."

if lsof -ti:8000 > /dev/null; then
  kill -9 $(lsof -ti:8000)
  echo "   ✔ Killed process on port 8000"
fi

#####################################
# 1. FIND BACKEND (manage.py)
#####################################

BACKEND_DIR=$(find . -maxdepth 4 -name "manage.py" -exec dirname {} \; | head -n 1)

if [ -z "$BACKEND_DIR" ]; then
  echo "❌ ERROR: manage.py not found. Are you in project root?"
  exit 1
fi

echo "📍 Backend detected at: $BACKEND_DIR"

cd "$BACKEND_DIR"

#####################################
# 2. VENV SETUP
#####################################

if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

#####################################
# 3. INSTALL DEPENDENCIES (SAFE CHECK)
#####################################

echo "📦 Checking Python dependencies..."

pip install --upgrade pip -q

# ensure python/pip align
python3 -m pip install --upgrade pip -q
python3 -m pip install django djangorestframework channels daphne channels-redis redis requests feedparser beautifulsoup4 -q


#####################################
# 4. START DJANGO (DAPHNE ONLY)
#####################################

# kill old server on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null

echo "🐍 Starting Django (Daphne)..."
python -m daphne backend.asgi:application &
BACKEND_PID=$!

#####################################
# 5. REDIS CHECK
#####################################

echo "📦 Checking Redis..."

if docker ps | grep -q "crimepredict-redis"; then
  echo "   ✔ Redis already running"
else
  echo "⚠️ Starting Redis container..."
  docker start crimepredict-redis 2>/dev/null || \
  echo "⚠️ Redis container not found (run manually: docker run -p 6379:6379 redis)"
fi

#####################################
# 6. START FRONTEND
#####################################

echo "⚛️ Starting React frontend..."

npm run dev &
FRONTEND_PID=$!

#####################################
# 7. FINAL STATUS
#####################################

echo ""
echo "✅ System running:"
echo "   Backend:  http://127.0.0.1:8000"
echo "   Frontend: http://localhost:5173"
echo "   Redis:    localhost:6379"
echo ""

wait $BACKEND_PID $FRONTEND_PID