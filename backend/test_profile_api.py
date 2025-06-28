#!/usr/bin/env python3
"""
프로필 수정 API 테스트 스크립트
422 에러를 재현하고 로그를 확인하기 위한 스크립트
"""

import requests
import json

BASE_URL = "http://localhost:8080/api"

def test_profile_update():
    # 1. 회원가입
    print("1. 회원가입 중...")
    signup_data = {
        "email": "test@example.com",
        "password": "password123",
        "name": "테스트사용자",
        "role": "mentor"
    }
    
    response = requests.post(f"{BASE_URL}/signup", json=signup_data)
    print(f"회원가입 응답: {response.status_code}")
    
    # 2. 로그인
    print("\n2. 로그인 중...")
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{BASE_URL}/login", json=login_data)
    print(f"로그인 응답: {response.status_code}")
    
    if response.status_code == 200:
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"토큰 획득: {token[:20]}...")
        
        # 3. 내 정보 조회
        print("\n3. 내 정보 조회...")
        response = requests.get(f"{BASE_URL}/me", headers=headers)
        print(f"내 정보 조회 응답: {response.status_code}")
        if response.status_code == 200:
            user_info = response.json()
            print(f"사용자 ID: {user_info['id']}")
            print(f"사용자 역할: {user_info['role']}")
            
            # 4. 프로필 수정 - 올바른 데이터
            print("\n4. 프로필 수정 (올바른 데이터)...")
            profile_data = {
                "id": user_info["id"],
                "name": "수정된 이름",
                "role": user_info["role"],
                "bio": "수정된 소개",
                "image": "",
                "skills": ["Python", "FastAPI"] if user_info["role"] == "mentor" else None
            }
            
            response = requests.put(f"{BASE_URL}/profile", json=profile_data, headers=headers)
            print(f"프로필 수정 응답: {response.status_code}")
            if response.status_code != 200:
                print(f"에러 응답: {response.text}")
            
            # 5. 프로필 수정 - 잘못된 데이터 (422 에러 유발)
            print("\n5. 프로필 수정 (잘못된 데이터 - 필수 필드 누락)...")
            invalid_profile_data = {
                "id": user_info["id"],
                "name": "수정된 이름",
                # "role": user_info["role"],  # role 필드 누락
                "bio": "수정된 소개",
                "image": "",
                "skills": ["Python", "FastAPI"] if user_info["role"] == "mentor" else None
            }
            
            response = requests.put(f"{BASE_URL}/profile", json=invalid_profile_data, headers=headers)
            print(f"잘못된 데이터로 프로필 수정 응답: {response.status_code}")
            if response.status_code != 200:
                print(f"에러 응답: {response.text}")
            
            # 6. 프로필 수정 - 타입 에러 (422 에러 유발)
            print("\n6. 프로필 수정 (타입 에러)...")
            type_error_data = {
                "id": "잘못된타입",  # 정수 대신 문자열
                "name": "수정된 이름",
                "role": user_info["role"],
                "bio": "수정된 소개",
                "image": "",
                "skills": ["Python", "FastAPI"] if user_info["role"] == "mentor" else None
            }
            
            response = requests.put(f"{BASE_URL}/profile", json=type_error_data, headers=headers)
            print(f"타입 에러로 프로필 수정 응답: {response.status_code}")
            if response.status_code != 200:
                print(f"에러 응답: {response.text}")

if __name__ == "__main__":
    test_profile_update()
