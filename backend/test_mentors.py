#!/usr/bin/env python3
"""
멘토 리스트 조회 API 테스트 스크립트
"""

import requests
import json

BASE_URL = "http://localhost:8080/api"

def test_mentor_list_api():
    """멘토 리스트 API 테스트"""
    
    # 1. 먼저 멘토들을 생성
    mentors_data = [
        {
            "email": "alice@example.com",
            "password": "password123",
            "name": "Alice Kim",
            "role": "mentor"
        },
        {
            "email": "bob@example.com", 
            "password": "password123",
            "name": "Bob Lee",
            "role": "mentor"
        },
        {
            "email": "charlie@example.com",
            "password": "password123", 
            "name": "Charlie Park",
            "role": "mentor"
        }
    ]
    
    # 2. 멘티 생성
    mentee_data = {
        "email": "student@example.com",
        "password": "password123",
        "name": "Student Kim",
        "role": "mentee"
    }
    
    print("=== 멘토 리스트 조회 API 테스트 ===\n")
    
    # 사용자들 생성
    print("1. 테스트 사용자들 생성 중...")
    
    for mentor in mentors_data:
        response = requests.post(f"{BASE_URL}/signup", json=mentor)
        if response.status_code == 201:
            print(f"   ✅ 멘토 {mentor['name']} 생성 성공")
        else:
            print(f"   ❌ 멘토 {mentor['name']} 생성 실패: {response.text}")
    
    # 멘티 생성
    response = requests.post(f"{BASE_URL}/signup", json=mentee_data)
    if response.status_code == 201:
        print(f"   ✅ 멘티 {mentee_data['name']} 생성 성공")
    else:
        print(f"   ❌ 멘티 {mentee_data['name']} 생성 실패: {response.text}")
    
    # 3. 멘티로 로그인
    print("\n2. 멘티로 로그인 중...")
    login_response = requests.post(f"{BASE_URL}/login", json={
        "email": mentee_data["email"],
        "password": mentee_data["password"]
    })
    
    if login_response.status_code != 200:
        print(f"   ❌ 로그인 실패: {login_response.text}")
        return
    
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   ✅ 로그인 성공")
    
    # 4. 멘토들의 프로필을 업데이트 (스킬 추가)
    print("\n3. 멘토들 프로필 업데이트 중...")
    
    # 각 멘토로 로그인해서 프로필 업데이트
    mentor_profiles = [
        {
            "mentor": mentors_data[0],
            "profile_update": {
                "id": 1,
                "name": "Alice Kim",
                "role": "mentor", 
                "bio": "Frontend specialist with React expertise",
                "image": "",
                "skills": ["React", "JavaScript", "TypeScript"]
            }
        },
        {
            "mentor": mentors_data[1],
            "profile_update": {
                "id": 2,
                "name": "Bob Lee",
                "role": "mentor",
                "bio": "Backend developer specializing in Python",
                "image": "",
                "skills": ["Python", "FastAPI", "Django"]
            }
        },
        {
            "mentor": mentors_data[2],
            "profile_update": {
                "id": 3,
                "name": "Charlie Park", 
                "role": "mentor",
                "bio": "Full-stack developer",
                "image": "",
                "skills": ["React", "Python", "Node.js"]
            }
        }
    ]
    
    for mentor_data in mentor_profiles:
        # 멘토로 로그인
        mentor_login = requests.post(f"{BASE_URL}/login", json={
            "email": mentor_data["mentor"]["email"],
            "password": mentor_data["mentor"]["password"]
        })
        
        if mentor_login.status_code == 200:
            mentor_token = mentor_login.json()["token"]
            mentor_headers = {"Authorization": f"Bearer {mentor_token}"}
            
            # 프로필 업데이트
            profile_response = requests.put(
                f"{BASE_URL}/profile",
                json=mentor_data["profile_update"],
                headers=mentor_headers
            )
            
            if profile_response.status_code == 200:
                print(f"   ✅ {mentor_data['mentor']['name']} 프로필 업데이트 성공")
            else:
                print(f"   ❌ {mentor_data['mentor']['name']} 프로필 업데이트 실패: {profile_response.text}")
    
    # 5. 멘토 리스트 조회 테스트
    print("\n4. 멘토 리스트 조회 테스트")
    
    # 전체 멘토 리스트
    print("\n   📋 전체 멘토 리스트:")
    response = requests.get(f"{BASE_URL}/mentors", headers=headers)
    if response.status_code == 200:
        mentors = response.json()
        print(f"   ✅ 총 {len(mentors)}명의 멘토 조회 성공")
        for mentor in mentors:
            print(f"      - {mentor['profile']['name']}: {', '.join(mentor['profile']['skills'])}")
    else:
        print(f"   ❌ 전체 멘토 리스트 조회 실패: {response.text}")
    
    # React 스킬로 필터링
    print("\n   🔍 React 스킬 필터링:")
    response = requests.get(f"{BASE_URL}/mentors?skill=React", headers=headers)
    if response.status_code == 200:
        mentors = response.json()
        print(f"   ✅ React 스킬 멘토 {len(mentors)}명 조회 성공")
        for mentor in mentors:
            print(f"      - {mentor['profile']['name']}: {', '.join(mentor['profile']['skills'])}")
    else:
        print(f"   ❌ React 스킬 필터링 실패: {response.text}")
    
    # Python 스킬로 필터링  
    print("\n   🔍 Python 스킬 필터링:")
    response = requests.get(f"{BASE_URL}/mentors?skill=Python", headers=headers)
    if response.status_code == 200:
        mentors = response.json()
        print(f"   ✅ Python 스킬 멘토 {len(mentors)}명 조회 성공")
        for mentor in mentors:
            print(f"      - {mentor['profile']['name']}: {', '.join(mentor['profile']['skills'])}")
    else:
        print(f"   ❌ Python 스킬 필터링 실패: {response.text}")
    
    # 이름으로 정렬
    print("\n   📝 이름으로 정렬:")
    response = requests.get(f"{BASE_URL}/mentors?order_by=name", headers=headers)
    if response.status_code == 200:
        mentors = response.json()
        print(f"   ✅ 이름순 정렬 성공")
        for mentor in mentors:
            print(f"      - {mentor['profile']['name']}")
    else:
        print(f"   ❌ 이름순 정렬 실패: {response.text}")
    
    # 스킬로 정렬
    print("\n   🛠️ 스킬로 정렬:")
    response = requests.get(f"{BASE_URL}/mentors?order_by=skill", headers=headers)
    if response.status_code == 200:
        mentors = response.json()
        print(f"   ✅ 스킬순 정렬 성공")
        for mentor in mentors:
            first_skill = mentor['profile']['skills'][0] if mentor['profile']['skills'] else "No skills"
            print(f"      - {mentor['profile']['name']}: {first_skill}")
    else:
        print(f"   ❌ 스킬순 정렬 실패: {response.text}")
    
    print("\n=== 테스트 완료 ===")

if __name__ == "__main__":
    test_mentor_list_api()
