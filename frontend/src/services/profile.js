import api from './api';

export const profileService = {
  // 내 정보 조회
  async getMyProfile() {
    console.log('🔥 내 정보 조회 요청 시작');
    try {
      const response = await api.get('/me');
      console.log('✅ 내 정보 조회 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ 내 정보 조회 실패:', error);
      throw error;
    }
  },

  // 프로필 업데이트
  async updateProfile(profileData) {
    console.log('🔥 프로필 업데이트 요청 시작:', {
      ...profileData,
      image: profileData.image ? `[Base64 데이터 ${profileData.image.length}자]` : undefined
    });
    try {
      const response = await api.put('/profile', profileData);
      console.log('✅ 프로필 업데이트 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ 프로필 업데이트 실패:', error);
      throw error;
    }
  },

  // 멘토 리스트 조회 (멘티용)
  async getMentors(skill = '', orderBy = '') {
    const params = new URLSearchParams();
    if (skill) params.append('skill', skill);
    if (orderBy) params.append('order_by', orderBy);
    
    const response = await api.get(`/mentors?${params.toString()}`);
    return response.data;
  },

  // 매칭 요청 생성 (멘티용)
  async createMatchRequest(matchRequestData) {
    const response = await api.post('/match-requests', matchRequestData);
    return response.data;
  },

  // 받은 매칭 요청 조회 (멘토용)
  async getIncomingMatchRequests() {
    const response = await api.get('/match-requests/incoming');
    return response.data;
  },

  // 보낸 매칭 요청 조회 (멘티용)
  async getOutgoingMatchRequests() {
    const response = await api.get('/match-requests/outgoing');
    return response.data;
  },

  // 매칭 요청 수락 (멘토용)
  async acceptMatchRequest(requestId) {
    const response = await api.put(`/match-requests/${requestId}/accept`);
    return response.data;
  },

  // 매칭 요청 거절 (멘토용)
  async rejectMatchRequest(requestId) {
    const response = await api.put(`/match-requests/${requestId}/reject`);
    return response.data;
  },

  // 매칭 요청 취소 (멘티용)
  async cancelMatchRequest(requestId) {
    const response = await api.delete(`/match-requests/${requestId}`);
    return response.data;
  },

  // 이미지 로드 (인증 헤더 포함)
  async loadImage(imageUrl) {
    console.log('🔥 이미지 로드 요청 시작:', imageUrl);
    try {
      const response = await api.get(imageUrl, {
        responseType: 'blob'  // 이미지를 blob으로 받기
      });
      console.log('✅ 이미지 로드 성공, 크기:', response.data.size, 'bytes');
      
      // Blob을 URL로 변환
      const blob = response.data;
      const imageObjectURL = URL.createObjectURL(blob);
      console.log('🖼️ 이미지 Blob URL 생성:', imageObjectURL);
      
      return imageObjectURL;
    } catch (error) {
      console.error('❌ 이미지 로드 실패:', error);
      throw error;
    }
  },

  // 이미지 URL 정리 (메모리 해제)
  revokeImageUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      console.log('🗑️ 이미지 Blob URL 해제:', url);
    }
  }
};
