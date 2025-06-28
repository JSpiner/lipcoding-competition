#!/bin/bash

# ================================
# 프론트엔드 개발 서버 실행 스크립트
# ================================

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로고 출력
echo -e "${CYAN}"
echo "================================"
echo "🚀 멘토-멘티 매칭 앱 프론트엔드"
echo "================================"
echo -e "${NC}"

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${BLUE}📁 작업 디렉토리: ${SCRIPT_DIR}${NC}"

# Node.js 버전 확인
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js 버전: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}❌ Node.js가 설치되지 않았습니다.${NC}"
    echo -e "${YELLOW}💡 Node.js를 설치한 후 다시 실행해주세요.${NC}"
    exit 1
fi

# npm 버전 확인
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm 버전: ${NPM_VERSION}${NC}"
else
    echo -e "${RED}❌ npm이 설치되지 않았습니다.${NC}"
    exit 1
fi

# package.json 파일 존재 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json 파일을 찾을 수 없습니다.${NC}"
    echo -e "${YELLOW}💡 프론트엔드 디렉토리에서 실행해주세요.${NC}"
    exit 1
fi

echo ""
echo -e "${PURPLE}🔍 프로젝트 정보:${NC}"
echo -e "${CYAN}$(grep '"name"' package.json)${NC}"
echo -e "${CYAN}$(grep '"version"' package.json)${NC}"
echo ""

# node_modules 존재 확인
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 node_modules가 없습니다. 의존성을 설치합니다...${NC}"
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 의존성 설치 완료!${NC}"
    else
        echo -e "${RED}❌ 의존성 설치 실패${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ node_modules 확인됨${NC}"
fi

# 포트 확인 함수
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # 포트가 사용 중
    else
        return 1  # 포트가 사용 가능
    fi
}

# 3000번 포트 확인
echo ""
echo -e "${BLUE}🔍 포트 상태 확인 중...${NC}"

if check_port 3000; then
    echo -e "${YELLOW}⚠️  포트 3000이 이미 사용 중입니다.${NC}"
    echo -e "${CYAN}💡 Vite가 자동으로 다른 포트를 찾을 것입니다.${NC}"
else
    echo -e "${GREEN}✅ 포트 3000 사용 가능${NC}"
fi

# 백엔드 서버 상태 확인
echo ""
echo -e "${BLUE}🔍 백엔드 서버 상태 확인 중...${NC}"

if check_port 8080; then
    echo -e "${GREEN}✅ 백엔드 서버가 실행 중입니다 (포트 8080)${NC}"
else
    echo -e "${YELLOW}⚠️  백엔드 서버가 실행되지 않았습니다.${NC}"
    echo -e "${CYAN}💡 백엔드 서버를 먼저 실행해주세요:${NC}"
    echo -e "${CYAN}   cd ../backend && ./run.sh${NC}"
fi

# 환경 변수 파일 확인
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env 파일 확인됨${NC}"
else
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다.${NC}"
    echo -e "${CYAN}💡 필요시 .env 파일을 생성해주세요.${NC}"
fi

echo ""
echo -e "${PURPLE}🚀 프론트엔드 개발 서버를 시작합니다...${NC}"
echo -e "${CYAN}💡 서버를 중지하려면 Ctrl + C를 누르세요.${NC}"
echo ""

# 개발 서버 실행
npm run dev

# 서버 종료 시 메시지
echo ""
echo -e "${YELLOW}🛑 프론트엔드 서버가 종료되었습니다.${NC}"
echo -e "${CYAN}👋 수고하셨습니다!${NC}"
