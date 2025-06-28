from fastapi import FastAPI, HTTPException, Depends, status, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List, Union
from pydantic import BaseModel, ValidationError, EmailStr
import json
import os
import base64
import logging
import traceback

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# FastAPI의 uvicorn 로거도 활성화
uvicorn_logger = logging.getLogger("uvicorn")
uvicorn_logger.setLevel(logging.INFO)

# JWT 설정
SECRET_KEY = "your-secret-key-here"  # 실제로는 환경변수로 관리해야 함
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing - rounds를 낮춰서 성능 향상
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=10)
security = HTTPBearer(auto_error=False)

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

class MentorProfile(BaseModel):
    name: str
    bio: str
    imageUrl: str
    skills: List[str]

class MenteeProfile(BaseModel):
    name: str
    bio: str
    imageUrl: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    profile: Union[MentorProfile, MenteeProfile]

class MentorListItem(BaseModel):
    id: int
    email: str
    role: str
    profile: MentorProfile

# 아웃고잉 매칭 요청 응답 (message 필드 없음)
class MatchRequestOutgoing(BaseModel):
    id: int
    mentorId: int
    menteeId: int
    status: str

class UpdateProfileRequest(BaseModel):
    id: int
    name: str
    role: str
    bio: str
    image: Optional[str] = ""  # Base64 encoded string - optional로 변경
    skills: Optional[List[str]] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 1,
                "name": "김멘토",
                "role": "mentor",
                "bio": "프론트엔드 개발 멘토입니다",
                "image": "",
                "skills": ["React", "Vue", "JavaScript"]
            }
        }
    }

class MatchRequest(BaseModel):
    id: int
    mentorId: int
    menteeId: int
    message: str
    status: str  # "pending", "accepted", "rejected", "cancelled"

class CreateMatchRequest(BaseModel):
    mentorId: int
    menteeId: int
    message: str

class MatchRequestResponse(BaseModel):
    id: int
    mentorId: int
    menteeId: int
    message: str
    status: str

class User(BaseModel):
    id: int
    email: str
    role: str
    profile: UserProfile
    hashed_password: str

# In-memory 저장소
users_db: List[User] = []
user_id_counter = 1

# 매칭 요청 저장소
match_requests_db: List[MatchRequest] = []
match_request_id_counter = 1

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

def get_user_by_id(user_id: int) -> Optional[User]:
    for user in users_db:
        if user.id == user_id:
            return user
    return None

def get_match_request_by_id(request_id: int) -> Optional[MatchRequest]:
    for match_request in match_requests_db:
        if match_request.id == request_id:
            return match_request
    return None

def create_match_request(mentor_id: int, mentee_id: int, message: str) -> MatchRequest:
    global match_request_id_counter
    
    match_request = MatchRequest(
        id=match_request_id_counter,
        mentorId=mentor_id,
        menteeId=mentee_id,
        message=message,
        status="pending"
    )
    
    match_requests_db.append(match_request)
    match_request_id_counter += 1
    return match_request

def get_incoming_requests(mentor_id: int) -> List[MatchRequest]:
    return [req for req in match_requests_db if req.mentorId == mentor_id]

def get_outgoing_requests(mentee_id: int) -> List[MatchRequest]:
    return [req for req in match_requests_db if req.menteeId == mentee_id]

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        # Authorization 헤더가 없거나 토큰이 없는 경우
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        if not credentials.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token required",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        user = get_user_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return user
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )

def create_user_response(user: User) -> UserResponse:
    """User 객체를 UserResponse로 변환"""
    if user.role == "mentor":
        profile = MentorProfile(
            name=user.profile.name,
            bio=user.profile.bio or "",
            imageUrl=user.profile.imageUrl or f"/images/mentor/{user.id}",
            skills=user.profile.skills or []
        )
    else:  # mentee
        profile = MenteeProfile(
            name=user.profile.name,
            bio=user.profile.bio or "",
            imageUrl=user.profile.imageUrl or f"/images/mentee/{user.id}"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        profile=profile
    )

def authenticate_user(email: str, password: str) -> Optional[User]:
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_user(signup_data: SignupRequest) -> User:
    global user_id_counter
    
    logger.info(f"👤 Creating user {user_id_counter} - {signup_data.name}")
    
    # 기본 이미지 URL 생성
    image_url = f"/images/{signup_data.role}/{user_id_counter}"
    
    # 프로필 생성
    profile = UserProfile(
        name=signup_data.name,
        bio="",
        imageUrl=image_url,
        skills=[] if signup_data.role == "mentor" else None
    )
    
    # 패스워드 해싱 (가장 시간이 많이 걸리는 부분)
    logger.info(f"🔐 Hashing password for user {user_id_counter}")
    hashed_password = get_password_hash(signup_data.password)
    logger.info(f"✅ Password hashed for user {user_id_counter}")
    
    # 사용자 생성
    user = User(
        id=user_id_counter,
        email=signup_data.email,
        role=signup_data.role,
        profile=profile,
        hashed_password=hashed_password
    )
    
    users_db.append(user)
    logger.info(f"✅ User {user_id_counter} added to database")
    user_id_counter += 1
    return user

def init_test_data():
    """테스트 데이터 초기화"""
    global users_db, user_id_counter
    
    # 이미 데이터가 있으면 초기화하지 않음
    if len(users_db) > 0:
        return
    
    logger.info("Initializing test data...")
    
    # 멘토 테스트 데이터
    mentors_data = [
        {
            "email": "mentor1@example.com",
            "password": "password123",
            "name": "김프론트",
            "role": "mentor",
            "bio": "React와 Vue.js 전문 프론트엔드 개발자입니다. 5년 경력으로 다양한 프로젝트 경험이 있습니다.",
            "skills": ["React", "Vue", "JavaScript", "TypeScript"]
        },
        {
            "email": "mentor2@example.com", 
            "password": "password123",
            "name": "이백엔드",
            "role": "mentor",
            "bio": "Python과 Java를 활용한 백엔드 개발 전문가입니다. 대용량 시스템 설계 경험이 풍부합니다.",
            "skills": ["Python", "FastAPI", "Django", "Java", "Spring Boot"]
        },
        {
            "email": "mentor3@example.com",
            "password": "password123", 
            "name": "박풀스택",
            "role": "mentor",
            "bio": "풀스택 개발자로 프론트엔드부터 백엔드까지 전 영역을 다룹니다. 스타트업 경험이 많습니다.",
            "skills": ["React", "Node.js", "Express", "MongoDB", "PostgreSQL"]
        },
        {
            "email": "mentor4@example.com",
            "password": "password123",
            "name": "최모바일",
            "role": "mentor", 
            "bio": "React Native와 Flutter를 이용한 모바일 앱 개발 전문가입니다.",
            "skills": ["React Native", "Flutter", "iOS", "Android", "Dart"]
        },
        {
            "email": "mentor5@example.com",
            "password": "password123",
            "name": "정데이터",
            "role": "mentor",
            "bio": "데이터 분석과 머신러닝 전문가입니다. Python을 주로 사용합니다.",
            "skills": ["Python", "Pandas", "NumPy", "TensorFlow", "PyTorch"]
        }
    ]
    
    # 멘티 테스트 데이터
    mentees_data = [
        {
            "email": "mentee1@example.com",
            "password": "password123",
            "name": "김신입",
            "role": "mentee",
            "bio": "프론트엔드 개발자를 꿈꾸는 신입 개발자입니다. React를 배우고 있습니다."
        },
        {
            "email": "mentee2@example.com",
            "password": "password123", 
            "name": "이학생",
            "role": "mentee",
            "bio": "컴퓨터공학과 학생입니다. 백엔드 개발에 관심이 많습니다."
        },
        {
            "email": "mentee3@example.com",
            "password": "password123",
            "name": "박취준",
            "role": "mentee", 
            "bio": "취업 준비생입니다. 웹 개발 전반에 대해 배우고 싶습니다."
        },
        {
            "email": "mentee4@example.com",
            "password": "password123",
            "name": "최전향",
            "role": "mentee",
            "bio": "비전공자에서 개발자로 전향하려고 합니다. 모바일 앱 개발에 관심이 있습니다."
        }
    ]
    
    # 멘토 데이터 생성
    for mentor_data in mentors_data:
        signup_request = SignupRequest(
            email=mentor_data["email"],
            password=mentor_data["password"],
            name=mentor_data["name"],
            role=mentor_data["role"]
        )
        user = create_user(signup_request)
        
        # 추가 프로필 정보 설정
        user.profile.bio = mentor_data["bio"]
        user.profile.skills = mentor_data["skills"]
        
        logger.info(f"Created mentor: {user.profile.name} (ID: {user.id})")
    
    # 멘티 데이터 생성  
    for mentee_data in mentees_data:
        signup_request = SignupRequest(
            email=mentee_data["email"],
            password=mentee_data["password"], 
            name=mentee_data["name"],
            role=mentee_data["role"]
        )
        user = create_user(signup_request)
        
        # 추가 프로필 정보 설정
        user.profile.bio = mentee_data["bio"]
        
        logger.info(f"Created mentee: {user.profile.name} (ID: {user.id})")
    
    logger.info(f"Test data initialization completed. Total users: {len(users_db)}")

app = FastAPI(
    title="Mentor-Mentee API",
    description="A simple FastAPI backend for mentor-mentee matching system",
    version="1.0.0"
)

# 서버 시작 시 테스트 데이터 초기화
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 실행되는 이벤트"""
    logger.info("Server starting up...")
    init_test_data()
    logger.info("Server startup completed")

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
    """Swagger UI로 리다이렉트"""
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/health")
async def api_health_check():
    """API Health check endpoint"""
    return {"status": "healthy", "api": "mentor-mentee", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/debug/users")
async def debug_users():
    """디버그용: 모든 사용자 정보 조회"""
    try:
        users_info = []
        for user in users_db:
            user_info = {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "profile": {
                    "name": user.profile.name,
                    "bio": user.profile.bio,
                    "imageUrl": user.profile.imageUrl,
                    "skills": user.profile.skills if hasattr(user.profile, 'skills') else []
                }
            }
            users_info.append(user_info)
        
        return {
            "total_users": len(users_db),
            "users": users_info
        }
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# API 엔드포인트들
@app.post("/api/signup", status_code=status.HTTP_201_CREATED)
async def signup(signup_data: SignupRequest = Body(...)):
    """회원가입"""
    request_start = datetime.utcnow()
    try:
        # 이메일 형식 체크 및 필수 필드 체크
        if not signup_data.email or not signup_data.password or not signup_data.name or not signup_data.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        
        # 중복 이메일 체크
        existing_user = get_user_by_email(signup_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        
        # 이메일 형식 검증
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, signup_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        if signup_data.role not in ["mentor", "mentee"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role"
            )
        response_data = create_user_response(create_user(signup_data))
        return response_data
    except HTTPException as e:
        total_time = (datetime.utcnow() - request_start).total_seconds()
        logger.error(f"❌ SIGNUP HTTP ERROR ({total_time:.3f}s): {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        total_time = (datetime.utcnow() - request_start).total_seconds()
        logger.error(f"💥 SIGNUP ERROR ({total_time:.3f}s): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.post("/api/login", response_model=LoginResponse)
async def login(login_data: LoginRequest = Body(...)):
    """로그인"""
    try:
        logger.info(f"🔐 LOGIN ATTEMPT: {login_data.email}")
        # 필수 필드 체크
        if not login_data.email or not login_data.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing required fields"
            )
        # 사용자 인증
        user = authenticate_user(login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        # JWT 토큰 생성
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id, "role": user.role}, 
            expires_delta=access_token_expires
        )
        logger.info(f"✅ LOGIN SUCCESS: User {user.id} ({user.email}) as {user.role}")
        response_data = LoginResponse(token=access_token)
        logger.info(f"📤 LOGIN RESPONSE: Token generated for user {user.id}")
        return response_data
    except HTTPException as e:
        logger.error(f"❌ LOGIN HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 LOGIN UNEXPECTED ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.get("/api/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """내 정보 조회"""
    try:
        logger.info(f"👤 GET MY INFO: User {current_user.id} ({current_user.email})")
        
        response_data = create_user_response(current_user)
        logger.info(f"📤 MY INFO RESPONSE: User {current_user.id} - {current_user.profile.name} ({current_user.role})")
        
        return response_data
    except Exception as e:
        logger.error(f"💥 GET MY INFO ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.put("/api/profile", response_model=UserResponse)
async def update_profile(
    request: Request,
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user)
):
    """프로필 수정"""
    try:
        # 요청 데이터 로깅
        logger.info(f"Profile update request from user {current_user.id}")
        logger.info(f"Request data: {profile_data.dict()}")
        
        # 사용자 ID 확인
        if profile_data.id != current_user.id:
            logger.warning(f"User {current_user.id} tried to update profile of user {profile_data.id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update profile of another user"
            )
        
        # 역할 확인
        if profile_data.role != current_user.role:
            logger.warning(f"User {current_user.id} tried to change role from {current_user.role} to {profile_data.role}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change user role"
            )
        
        # 이미지 처리 (Base64 디코딩 및 저장)
        image_path = None
        if profile_data.image and profile_data.image.strip():  # 빈 문자열 체크 추가
            try:
                logger.info(f"Processing image upload for user {current_user.id}")
                # Base64 디코딩
                image_data = base64.b64decode(profile_data.image)
                logger.info(f"Image decoded successfully, size: {len(image_data)} bytes")
                
                # 이미지 저장 디렉토리 생성
                images_dir = f"images/{current_user.role}"
                os.makedirs(images_dir, exist_ok=True)
                
                # 이미지 파일 저장 (PNG 형식)
                image_filename = f"{current_user.id}.png"
                image_path = os.path.join(images_dir, image_filename)
                
                with open(image_path, "wb") as f:
                    f.write(image_data)
                
                logger.info(f"Image saved to: {image_path}")
                
            except Exception as e:
                logger.error(f"Image processing error for user {current_user.id}: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid image data: {str(e)}"
                )
        else:
            logger.info(f"No image provided for user {current_user.id}, skipping image processing")
        
        # 프로필 업데이트
        logger.info(f"Updating profile for user {current_user.id}")
        current_user.profile.name = profile_data.name
        current_user.profile.bio = profile_data.bio
        
        if current_user.role == "mentor" and profile_data.skills is not None:
            current_user.profile.skills = profile_data.skills
            logger.info(f"Updated skills for mentor {current_user.id}: {profile_data.skills}")
        
        if image_path:
            current_user.profile.imageUrl = f"/images/{current_user.role}/{current_user.id}"
        
        logger.info(f"Profile update completed for user {current_user.id}")
        return create_user_response(current_user)
        
    except HTTPException:
        raise
    except ValidationError as e:
        logger.error(f"Validation error in profile update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in profile update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/api/mentors", response_model=List[MentorListItem])
async def get_mentors(
    skill: Optional[str] = None,
    order_by: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """멘토 전체 리스트 조회 (멘티 전용)"""
    try:
        logger.info(f"Mentor list request from user {current_user.id} (role: {current_user.role})")
        
        # 멘티만 접근 가능
        if current_user.role != "mentee":
            logger.warning(f"Non-mentee user {current_user.id} tried to access mentor list")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentees can access mentor list"
            )
        
        # 모든 멘토 사용자 가져오기
        mentors = [user for user in users_db if user.role == "mentor"]
        logger.info(f"Found {len(mentors)} mentors")
        
        # skill 파라미터로 필터링
        if skill:
            skill_lower = skill.lower()
            filtered_mentors = []
            for mentor in mentors:
                if mentor.profile.skills:
                    # 스킬 목록에서 대소문자 구분 없이 검색
                    mentor_skills = [s.lower() for s in mentor.profile.skills]
                    if skill_lower in mentor_skills:
                        filtered_mentors.append(mentor)
            mentors = filtered_mentors
            logger.info(f"Filtered by skill '{skill}': {len(mentors)} mentors found")
        
        # order_by 파라미터로 정렬
        if order_by == "name":
            mentors.sort(key=lambda x: x.profile.name.lower())
            logger.info("Sorted mentors by name")
        elif order_by == "skill":
            # 첫 번째 스킬을 기준으로 정렬 (스킬이 없으면 맨 뒤로)
            mentors.sort(key=lambda x: (x.profile.skills[0].lower() if x.profile.skills else "zzz"))
            logger.info("Sorted mentors by skill")
        else:
            # 기본: mentor ID 기준 오름차순
            mentors.sort(key=lambda x: x.id)
            logger.info("Sorted mentors by ID (default)")
        
        # API 스펙에 맞는 형식으로 변환 (profile 객체 안에 name 포함)
        mentor_list = []
        for mentor in mentors:
            mentor_profile = MentorProfile(
                name=mentor.profile.name,
                bio=mentor.profile.bio or "",
                imageUrl=mentor.profile.imageUrl or f"/images/mentor/{mentor.id}",
                skills=mentor.profile.skills or []
            )
            mentor_item = MentorListItem(
                id=mentor.id,
                email=mentor.email,
                role=mentor.role,
                profile=mentor_profile
            )
            mentor_list.append(mentor_item)
        
        logger.info(f"Returning {len(mentor_list)} mentors to user {current_user.id}")
        
        # 응답 데이터 로깅 (요약)
        logger.info(f"📤 MENTORS RESPONSE: {len(mentor_list)} mentors")
        for mentor in mentor_list[:3]:  # 처음 3명만 로깅
            logger.info(f"  - Mentor {mentor.id}: {mentor.profile.name} ({len(mentor.profile.skills)} skills)")
        if len(mentor_list) > 3:
            logger.info(f"  ... and {len(mentor_list) - 3} more mentors")
        
        return mentor_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_mentors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.get("/api/images/{role}/{user_id}")
async def get_profile_image(
    role: str,
    user_id: int
):
    """프로필 이미지 조회 - 인증 없이 접근 가능"""
    try:
        logger.info(f"🖼️ IMAGE REQUEST: Requesting image for {role}/{user_id}")
        
        # 역할 유효성 검사
        if role not in ["mentor", "mentee"]:
            logger.warning(f"❌ IMAGE ERROR: Invalid role {role}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role"
            )
        
        # 여러 이미지 형식 지원 (png, jpg, jpeg)
        image_extensions = [".png", ".jpg", ".jpeg"]
        image_path = None
        
        for ext in image_extensions:
            potential_path = f"images/{role}/{user_id}{ext}"
            if os.path.exists(potential_path):
                image_path = potential_path
                logger.info(f"📁 IMAGE FOUND: {image_path}")
                break
        
        # 파일이 없으면 기본 이미지 생성
        if not image_path:
            logger.info(f"📁 IMAGE NOT FOUND: Creating default image for {role}/{user_id}")
            # 기본 이미지 생성
            from create_test_images import create_single_image
            
            # 사용자 정보 가져오기
            target_user = get_user_by_id(user_id)
            user_name = target_user.profile.name if target_user else "User"
            
            image_path = create_single_image(
                user_id=user_id,
                role=role,
                name=user_name,
                filename=f"images/{role}/{user_id}.png"
            )
            logger.info(f"✅ IMAGE CREATED: {image_path}")
        
        # 미디어 타입 결정
        if image_path.endswith('.png'):
            media_type = "image/png"
        elif image_path.endswith('.jpg') or image_path.endswith('.jpeg'):
            media_type = "image/jpeg"
        else:
            media_type = "image/png"
        
        logger.info(f"📤 IMAGE RESPONSE: Serving {image_path} as {media_type}")
        return FileResponse(image_path, media_type=media_type)
        
    except HTTPException as e:
        logger.error(f"❌ IMAGE HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 IMAGE UNEXPECTED ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# 422 에러 핸들러 추가
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """422 Validation Error 핸들러 → 400 Bad Request로 변경"""
    logger.error(f"Validation error on {request.url}: {exc.errors()}")
    logger.error("Request body reading skipped to avoid timeout issues")
    return JSONResponse(
        status_code=400,  # 422 → 400
        content={
            "detail": exc.errors(),
            "message": "Bad request: Request validation failed",
            "url": str(request.url),
            "method": request.method
        }
    )


# 매칭 요청 API 엔드포인트들
@app.post("/api/match-requests", response_model=MatchRequestResponse)
async def create_match_request_api(
    match_data: CreateMatchRequest = Body(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # 멘티만 요청 가능
        if current_user.role != "mentee":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentees can send match requests"
            )
        # 필수 필드 체크
        if not match_data.mentorId or not match_data.menteeId or not match_data.message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        # 멘토 존재 여부 체크
        mentor = get_user_by_id(match_data.mentorId)
        if not mentor or mentor.role != "mentor":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mentor not found"
            )
        # 본인(멘티) ID와 일치하는지 체크
        if match_data.menteeId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mentee ID mismatch"
            )
        match_request = create_match_request(match_data.mentorId, match_data.menteeId, match_data.message)
        return MatchRequestResponse(**match_request.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_match_request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.get("/api/match-requests/incoming", response_model=List[MatchRequestResponse])
async def get_incoming_match_requests(
    current_user: User = Depends(get_current_user)
):
    """나에게 들어온 요청 목록 (멘토 전용)"""
    try:
        logger.info(f"📥 INCOMING REQUESTS: Mentor {current_user.id} checking incoming requests")
        
        # 멘토만 접근 가능
        if current_user.role != "mentor":
            logger.warning(f"Non-mentor user {current_user.id} tried to access incoming requests")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can access incoming match requests"
            )
        
        # 해당 멘토에게 온 요청들 가져오기
        incoming_requests = get_incoming_requests(current_user.id)
        
        logger.info(f"📤 INCOMING REQUESTS RESPONSE: {len(incoming_requests)} requests for mentor {current_user.id}")
        
        response_data = [
            MatchRequestResponse(
                id=req.id,
                mentorId=req.mentorId,
                menteeId=req.menteeId,
                message=req.message,
                status=req.status
            )
            for req in incoming_requests
        ]
        
        return response_data
        
    except HTTPException as e:
        logger.error(f"❌ INCOMING REQUESTS HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 INCOMING REQUESTS UNEXPECTED ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.get("/api/match-requests/outgoing", response_model=List[MatchRequestOutgoing])
async def get_outgoing_match_requests(
    current_user: User = Depends(get_current_user)
):
    """내가 보낸 요청 목록 (멘티 전용)"""
    try:
        logger.info(f"📤 OUTGOING REQUESTS: Mentee {current_user.id} checking outgoing requests")
        
        # 멘티만 접근 가능
        if current_user.role != "mentee":
            logger.warning(f"Non-mentee user {current_user.id} tried to access outgoing requests")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentees can access outgoing match requests"
            )
        
        # 해당 멘티가 보낸 요청들 가져오기
        outgoing_requests = get_outgoing_requests(current_user.id)
        
        logger.info(f"📤 OUTGOING REQUESTS RESPONSE: {len(outgoing_requests)} requests from mentee {current_user.id}")
        
        # API 스펙에 맞는 형식으로 변환 (message 필드 제외)
        response_data = [
            MatchRequestOutgoing(
                id=req.id,
                mentorId=req.mentorId,
                menteeId=req.menteeId,
                status=req.status
            )
            for req in outgoing_requests
        ]
        
        return response_data
        
    except HTTPException as e:
        logger.error(f"❌ OUTGOING REQUESTS HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 OUTGOING REQUESTS UNEXPECTED ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.put("/api/match-requests/{request_id}/accept", response_model=MatchRequestResponse)
async def accept_match_request(
    request_id: int,
    current_user: User = Depends(get_current_user)
):
    """요청 수락 (멘토 전용)"""
    try:
        logger.info(f"✅ ACCEPT REQUEST: Mentor {current_user.id} accepting request {request_id}")
        
        # 멘토만 접근 가능
        if current_user.role != "mentor":
            logger.warning(f"Non-mentor user {current_user.id} tried to accept match request")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can accept match requests"
            )
        
        # 매칭 요청 찾기
        match_request = get_match_request_by_id(request_id)
        if not match_request:
            logger.warning(f"Match request {request_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match request not found"
            )
        
        # 해당 멘토의 요청인지 확인
        if match_request.mentorId != current_user.id:
            logger.warning(f"Mentor {current_user.id} tried to accept request {request_id} for mentor {match_request.mentorId}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only accept your own match requests"
            )
        
        # 이미 처리된 요청인지 확인
        if match_request.status != "pending":
            logger.warning(f"Match request {request_id} already processed: {match_request.status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Match request already {match_request.status}"
            )
        
        # 요청 수락
        match_request.status = "accepted"
        
        logger.info(f"✅ REQUEST ACCEPTED: Request {request_id} accepted by mentor {current_user.id}")
        
        response_data = MatchRequestResponse(
            id=match_request.id,
            mentorId=match_request.mentorId,
            menteeId=match_request.menteeId,
            message=match_request.message,
            status=match_request.status
        )
        
        return response_data
        
    except HTTPException as e:
        logger.error(f"❌ ACCEPT REQUEST HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 ACCEPT REQUEST UNEXPECTED ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.put("/api/match-requests/{request_id}/reject", response_model=MatchRequestResponse)
async def reject_match_request(
    request_id: int,
    current_user: User = Depends(get_current_user)
):
    """요청 거절 (멘토 전용)"""
    try:
        logger.info(f"❌ REJECT REQUEST: Mentor {current_user.id} rejecting request {request_id}")
        
        # 멘토만 접근 가능
        if current_user.role != "mentor":
            logger.warning(f"Non-mentor user {current_user.id} tried to reject match request")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can reject match requests"
            )
        
        # 매칭 요청 찾기
        match_request = get_match_request_by_id(request_id)
        if not match_request:
            logger.warning(f"Match request {request_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match request not found"
            )
        
        # 해당 멘토의 요청인지 확인
        if match_request.mentorId != current_user.id:
            logger.warning(f"Mentor {current_user.id} tried to reject request {request_id} for mentor {match_request.mentorId}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only reject your own match requests"
            )
        
        # 이미 처리된 요청인지 확인
        if match_request.status != "pending":
            logger.warning(f"Match request {request_id} already processed: {match_request.status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Match request already {match_request.status}"
            )
        
        # 요청 거절
        match_request.status = "rejected"
        
        logger.info(f"❌ REQUEST REJECTED: Request {request_id} rejected by mentor {current_user.id}")
        
        response_data = MatchRequestResponse(
            id=match_request.id,
            mentorId=match_request.mentorId,
            menteeId=match_request.menteeId,
            message=match_request.message,
            status=match_request.status
        )
        
        return response_data
        
    except HTTPException as e:
        logger.error(f"❌ REJECT REQUEST HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 REJECT REQUEST UNEXPECTED ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.delete("/api/match-requests/{request_id}", response_model=MatchRequestResponse)
async def cancel_match_request(
    request_id: int,
    current_user: User = Depends(get_current_user)
):
    """요청 삭제/취소 (멘티 전용)"""
    try:
        logger.info(f"🗑️ CANCEL REQUEST: Mentee {current_user.id} cancelling request {request_id}")
        
        # 멘티만 접근 가능
        if current_user.role != "mentee":
            logger.warning(f"Non-mentee user {current_user.id} tried to cancel match request")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentees can cancel match requests"
            )
        
        # 매칭 요청 찾기
        match_request = get_match_request_by_id(request_id)
        if not match_request:
            logger.warning(f"Match request {request_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match request not found"
            )
        
        # 해당 멘티의 요청인지 확인
        if match_request.menteeId != current_user.id:
            logger.warning(f"Mentee {current_user.id} tried to cancel request {request_id} from mentee {match_request.menteeId}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only cancel your own match requests"
            )
        
        # 이미 수락된 요청은 취소할 수 없음
        if match_request.status == "accepted":
            logger.warning(f"Cannot cancel accepted match request {request_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel accepted match request"
            )
        
        # 요청 취소
        match_request.status = "cancelled"
        
        logger.info(f"🗑️ REQUEST CANCELLED: Request {request_id} cancelled by mentee {current_user.id}")
        
        response_data = MatchRequestResponse(
            id=match_request.id,
            mentorId=match_request.mentorId,
            menteeId=match_request.menteeId,
            message=match_request.message,
            status=match_request.status
        )
        
        return response_data
        
    except HTTPException as e:
        logger.error(f"❌ CANCEL REQUEST HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 CANCEL REQUEST UNEXPECTED ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.post("/test/match-requests", tags=["test"])
async def create_test_match_requests():
    """매칭 요청 테스트 데이터 생성"""
    try:
        logger.info("🔧 Creating test match requests...")
        
        # 기존 매칭 요청 데이터 삭제
        global match_requests_db
        match_requests_db.clear()
        
        # 멘토와 멘티 ID 찾기
        mentors = [user for user in users_db if user.role == "mentor"]
        mentees = [user for user in users_db if user.role == "mentee"]
        
        if len(mentors) == 0 or len(mentees) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No mentors or mentees available. Please create test users first."
            )
        
        # 테스트 매칭 요청 메시지들
        test_messages = [
            {
                "message": """안녕하세요! 개발 공부를 시작한 지 얼마 되지 않은 초보 개발자입니다. 
기본기를 탄탄히 다지고 실무 경험을 쌓고 싶어서 멘토링을 신청드립니다.

현재 상황:
- 프로그래밍 기초 문법 학습 중
- 간단한 토이 프로젝트 경험 있음
- 체계적인 학습 방향 고민 중

도움 받고 싶은 부분:
- 학습 로드맵 설계
- 코드 리뷰 및 피드백
- 실무에서 필요한 기술 스택 조언

열정적으로 배우겠습니다. 감사합니다!""",
                "status": "pending"
            },
            {
                "message": """안녕하세요! 개발 경험이 어느 정도 있는 중급 개발자입니다.
더 나은 개발자로 성장하기 위해 멘토링을 요청드립니다.

현재 상황:
- 개발 경력 1-2년 또는 중급 수준
- 기본적인 프로젝트 개발 경험 보유
- 더 깊이 있는 기술 습득 희망

도움 받고 싶은 부분:
- 아키텍처 설계 및 베스트 프랙티스
- 코드 품질 향상 방법
- 실무 프로젝트에서의 문제 해결 접근법
- 커리어 발전 방향 조언

함께 성장할 수 있기를 기대합니다!""",
                "status": "accepted"
            },
            {
                "message": """안녕하세요! 개발자로서 커리어 전환을 준비하고 있습니다.
실무 진입을 위한 구체적인 가이드가 필요하여 멘토링을 신청합니다.

현재 상황:
- 개발 공부 중 (부트캠프/독학)
- 포트폴리오 프로젝트 준비 중
- 취업 준비 단계

도움 받고 싶은 부분:
- 포트폴리오 프로젝트 방향성
- 이력서 및 기술 면접 준비
- 실무에서 요구하는 기술 수준
- 개발자 취업 시장 이해

실무 경험을 바탕으로 한 조언 부탁드립니다!""",
                "status": "rejected"
            },
            {
                "message": """안녕하세요! 현재 진행 중인 프로젝트에서 막히는 부분이 있어 도움을 요청드립니다.

프로젝트 개요:
- 웹/앱 개발 프로젝트 진행 중
- 특정 기술 스택 사용 중
- 팀 프로젝트 또는 개인 프로젝트

현재 어려움:
- 기술적 이슈 해결
- 설계 방향성 결정
- 성능 최적화 방법

기대하는 도움:
- 문제 해결 방법론
- 코드 리뷰 및 개선 방향
- 프로젝트 완성도 향상

구체적인 조언 부탁드립니다!""",
                "status": "pending"
            },
            {
                "message": "안녕하세요! 개발 분야에서 성장하고 싶어 멘토링을 신청합니다. 실무 경험을 바탕으로 한 조언 부탁드립니다.",
                "status": "pending"
            }
        ]
        
        # 매칭 요청 생성
        request_id = 1
        for i, mentee in enumerate(mentees):
            for j, mentor in enumerate(mentors[:3]):  # 각 멘티당 최대 3개 멘토에게 요청
                if i < len(test_messages):
                    message_data = test_messages[i]
                else:
                    message_data = test_messages[0]  # 기본 메시지 사용
                
                match_request = MatchRequest(
                    id=request_id,
                    mentorId=mentor.id,
                    menteeId=mentee.id,
                    message=message_data["message"],
                    status=message_data["status"]
                )
                
                match_requests_db.append(match_request)
                logger.info(f"Created match request {request_id}: mentee {mentee.profile.name} -> mentor {mentor.profile.name} ({message_data['status']})")
                request_id += 1
                
                # 다양한 상태의 요청을 위해 순환
                if j == 1:  # 두 번째 멘토에게는 accepted 상태로
                    if len(test_messages) > 1:
                        message_data = test_messages[1]
                elif j == 2:  # 세 번째 멘토에게는 rejected 상태로
                    if len(test_messages) > 2:
                        message_data = test_messages[2]
        
        created_count = len(match_requests_db)
        logger.info(f"✅ Test match requests created successfully. Total: {created_count}")
        
        return {
            "message": f"Successfully created {created_count} test match requests",
            "total_requests": created_count,
            "by_status": {
                "pending": len([req for req in match_requests_db if req.status == "pending"]),
                "accepted": len([req for req in match_requests_db if req.status == "accepted"]),
                "rejected": len([req for req in match_requests_db if req.status == "rejected"])
            }
        }
        
    except HTTPException as e:
        logger.error(f"❌ CREATE TEST MATCH REQUESTS HTTP ERROR: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"💥 CREATE TEST MATCH REQUESTS UNEXPECTED ERROR: {str(e)}")
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
