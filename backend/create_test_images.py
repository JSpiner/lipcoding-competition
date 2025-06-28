#!/usr/bin/env python3
"""
테스트용 프로필 이미지 생성 스크립트
500x500 픽셀 크기의 정사각형 PNG 이미지를 생성합니다.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import random

def create_profile_image(width=500, height=500, user_id=1, role="mentor", name="User"):
    """
    프로필 이미지를 생성합니다.
    
    Args:
        width (int): 이미지 너비
        height (int): 이미지 높이
        user_id (int): 사용자 ID
        role (str): 사용자 역할 (mentor/mentee)
        name (str): 사용자 이름
    
    Returns:
        PIL.Image: 생성된 이미지 객체
    """
    
    # 랜덤 배경색 생성 (파스텔 톤)
    colors = [
        (255, 182, 193),  # Light Pink
        (173, 216, 230),  # Light Blue
        (144, 238, 144),  # Light Green
        (255, 218, 185),  # Peach
        (221, 160, 221),  # Plum
        (255, 228, 196),  # Bisque
        (176, 196, 222),  # Light Steel Blue
        (255, 192, 203),  # Pink
    ]
    
    bg_color = random.choice(colors)
    
    # 이미지 생성
    image = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    
    # 중앙에 원 그리기
    circle_radius = min(width, height) // 3
    center_x, center_y = width // 2, height // 2
    
    # 원 색상 (배경색보다 어두운 색)
    circle_color = tuple(max(0, c - 50) for c in bg_color)
    
    draw.ellipse([
        center_x - circle_radius, 
        center_y - circle_radius,
        center_x + circle_radius, 
        center_y + circle_radius
    ], fill=circle_color)
    
    # 텍스트 추가
    try:
        # 시스템 폰트 사용 시도
        font_size = 40
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # 폰트가 없으면 기본 폰트 사용
        font = ImageFont.load_default()
    
    # 사용자 이름의 첫 글자 또는 ID 표시
    if name and len(name) > 0:
        text = name[0].upper()
    else:
        text = str(user_id)
    
    # 텍스트 크기 계산
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    # 텍스트 중앙 배치
    text_x = center_x - text_width // 2
    text_y = center_y - text_height // 2
    
    # 텍스트 색상 (흰색)
    text_color = (255, 255, 255)
    draw.text((text_x, text_y), text, fill=text_color, font=font)
    
    # 역할 표시 (작은 텍스트)
    role_text = role.upper()
    try:
        role_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    except:
        role_font = ImageFont.load_default()
    
    role_bbox = draw.textbbox((0, 0), role_text, font=role_font)
    role_width = role_bbox[2] - role_bbox[0]
    role_x = center_x - role_width // 2
    role_y = center_y + circle_radius + 20
    
    draw.text((role_x, role_y), role_text, fill=(100, 100, 100), font=role_font)
    
    return image

def create_test_images():
    """테스트용 이미지들을 생성합니다."""
    
    # 테스트 사용자 데이터
    test_users = [
        {"id": 1, "role": "mentor", "name": "김멘토"},
        {"id": 2, "role": "mentor", "name": "이선생"},
        {"id": 3, "role": "mentor", "name": "박코치"},
        {"id": 1, "role": "mentee", "name": "최학생"},
        {"id": 2, "role": "mentee", "name": "정멘티"},
        {"id": 3, "role": "mentee", "name": "한배움"},
    ]
    
    for user in test_users:
        # 이미지 생성
        image = create_profile_image(
            width=500,
            height=500,
            user_id=user["id"],
            role=user["role"],
            name=user["name"]
        )
        
        # 저장 경로
        save_path = f"images/{user['role']}/{user['id']}.png"
        
        # 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        # 이미지 저장
        image.save(save_path, "PNG")
        print(f"✅ 생성완료: {save_path}")

def create_single_image(user_id=1, role="mentor", name="Test", filename=None):
    """단일 이미지를 생성합니다."""
    
    image = create_profile_image(
        width=500,
        height=500,
        user_id=user_id,
        role=role,
        name=name
    )
    
    if filename is None:
        filename = f"images/{role}/{user_id}.png"
    
    # 디렉토리가 없으면 생성
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    # 이미지 저장
    image.save(filename, "PNG")
    print(f"✅ 이미지 생성완료: {filename}")
    
    return filename

if __name__ == "__main__":
    print("🎨 테스트 프로필 이미지 생성 중...")
    
    try:
        # 여러 테스트 이미지 생성
        create_test_images()
        
        print("\n📁 생성된 이미지 파일들:")
        print("├── images/")
        print("│   ├── mentor/")
        print("│   │   ├── 1.png")
        print("│   │   ├── 2.png")
        print("│   │   └── 3.png")
        print("│   └── mentee/")
        print("│       ├── 1.png")
        print("│       ├── 2.png")
        print("│       └── 3.png")
        
        print("\n🎉 모든 테스트 이미지가 성공적으로 생성되었습니다!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        print("PIL 라이브러리가 설치되어 있는지 확인해주세요.")
        print("설치 명령어: pip install Pillow")
