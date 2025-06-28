from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
import json
import os

# JWT 설정
SECRET_KEY = "your-secret-key-here"  # 실제로는 환경변수로 관리해야 함
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Pydantic 모델들
class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str  # "mentor" or "mentee"

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str

class UserProfile(BaseModel):
    name: str
    bio: Optional[str] = ""
    imageUrl: Optional[str] = None
    skills: Optional[List[str]] = []

class User(BaseModel):
    id: int
    email: str
    role: str
    profile: UserProfile
    hashed_password: str

# In-memory 저장소
users_db: List[User] = []
user_id_counter = 1

# Helper functions
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(email: str) -> Optional[User]:
    for user in users_db:
        if user.email == email:
            return user
    return None

def authenticate_user(email: str, password: str) -> Optional[User]:
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_user(signup_data: SignupRequest) -> User:
    global user_id_counter
    
    # 기본 이미지 URL 생성
    image_url = f"/images/{signup_data.role}/{user_id_counter}"
    
    # 프로필 생성
    profile = UserProfile(
        name=signup_data.name,
        bio="",
        imageUrl=image_url,
        skills=[] if signup_data.role == "mentor" else None
    )
    
    # 사용자 생성
    user = User(
        id=user_id_counter,
        email=signup_data.email,
        role=signup_data.role,
        profile=profile,
        hashed_password=get_password_hash(signup_data.password)
    )
    
    users_db.append(user)
    user_id_counter += 1
    return user

app = FastAPI(
    title="Mentor-Mentee API",
    description="A simple FastAPI backend for mentor-mentee matching system",
    version="1.0.0"
)

# CORS 설정 (프론트엔드와 연결하기 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Mentor-Mentee API is running!"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# API 엔드포인트들
@app.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(signup_data: SignupRequest):
    """회원가입"""
    try:
        # 이메일 중복 체크
        if get_user_by_email(signup_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # role 유효성 검사
        if signup_data.role not in ["mentor", "mentee"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role must be either 'mentor' or 'mentee'"
            )
        
        # 사용자 생성
        user = create_user(signup_data)
        
        # 성공 응답 (비밀번호는 제외하고 반환)
        return {"message": "User created successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """로그인"""
    try:
        # 사용자 인증
        user = authenticate_user(login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # JWT 토큰 생성
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id, "role": user.role}, 
            expires_delta=access_token_expires
        )
        
        return LoginResponse(token=access_token)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


if __name__ == "__main__":
    try:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
    except ImportError:
        print("uvicorn not installed. Please install with: pip install uvicorn")
        print("For now, you can run with: python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload")
