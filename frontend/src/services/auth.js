import api from './api';

export const authService = {
  // 회원가입
  async signup(userData) {
    console.log('🔥 회원가입 요청 시작:', { ...userData, password: '***' });
    try {
      const response = await api.post('/signup', userData);
      console.log('✅ 회원가입 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ 회원가입 실패:', error);
      throw error;
    }
  },

  // 로그인
  async login(credentials) {
    console.log('🔥 로그인 요청 시작:', { ...credentials, password: '***' });
    try {
      const response = await api.post('/login', credentials);
      console.log('✅ 로그인 API 응답 받음:', { token: response.data.token ? '토큰 있음' : '토큰 없음' });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        console.log('💾 토큰 localStorage에 저장 완료');
        
        // 로그인 후 /me API를 호출하여 실제 사용자 정보 가져오기
        try {
          console.log('📡 /me API 호출 시작...');
          // 토큰이 이미 localStorage에 저장되었으므로, API 인터셉터가 자동으로 헤더에 추가함
          const userResponse = await api.get('/me');
          console.log('✅ /me API 응답:', userResponse.data);
          
          const user = {
            id: userResponse.data.id,  // API에서 받은 실제 DB PK ID 사용
            email: userResponse.data.email,
            name: userResponse.data.profile.name,
            role: userResponse.data.role,
            profile: userResponse.data.profile
          };
          localStorage.setItem('user', JSON.stringify(user));
          console.log('💾 사용자 정보 localStorage에 저장 완료:', user);
          console.log('🔑 사용된 토큰:', response.data.token.substring(0, 20) + '...');
        } catch (err) {
          console.error('❌ /me API 호출 실패:', err);
          console.error('📊 응답 상태:', err.response?.status);
          console.error('📝 응답 데이터:', err.response?.data);
          // /me API 호출 실패 시에도 토큰은 저장되어 있으므로, 나중에 재시도 가능
          console.log('⚠️ 사용자 정보는 나중에 /me API로 다시 가져옵니다.');
        }
      }
      return response.data;
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      throw error;
    }
  },

  // 로그아웃
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // 현재 사용자 정보 가져오기
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // 토큰 확인
  getToken() {
    return localStorage.getItem('authToken');
  },

  // 로그인 상태 확인
  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }
};
