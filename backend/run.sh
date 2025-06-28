#!/bin/bash
# nohup ./run.sh > run.log 2>&1 &

# Backend 실행 스크립트 - 8080포트
# 사용법: ./run.sh

set -e  # 오류 발생시 스크립트 중단

# 현재 디렉토리를 backend 폴더로 변경
cd "$(dirname "$0")"

echo "🚀 Starting Mentor-Mentee Backend API Server..."

# 가상환경 활성화
echo "📦 Setting up virtual environment..."
if [ -d "venv" ]; then
    echo "✅ Virtual environment found"
    source venv/bin/activate
    echo "✅ Virtual environment activated"
else
    echo "⚠️ Virtual environment not found. Creating new virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
    source venv/bin/activate
    echo "✅ Virtual environment activated"
fi

# 의존성 설치 확인
echo "📋 Checking dependencies..."
pip install -r requirements.txt

# FastAPI 서버 시작 (8080포트)
echo "🌐 Starting FastAPI server on port 8080..."
echo "📍 API URL: http://localhost:8080"
echo "📖 Swagger Docs: http://localhost:8080/docs"
echo "🔧 ReDoc: http://localhost:8080/redoc"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

# uvicorn으로 서버 실행 (8080포트, 개발 모드)
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
