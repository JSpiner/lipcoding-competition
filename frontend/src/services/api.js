import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const method = config.method?.toUpperCase();
  const url = config.url;
  const fullUrl = `${config.baseURL}${url}`;
  
  console.log(`🚀 API 요청 시작: ${method} ${url}`);
  console.log(`� 전체 URL: ${fullUrl}`);
  console.log(`⏱️ 요청 시간:`, new Date().toLocaleTimeString());
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`� 토큰 전달: ${token.substring(0, 20)}...`);
  } else {
    console.log(`🚫 토큰 없음 - 인증이 필요한 요청일 경우 실패할 수 있습니다`);
  }
  
  // 요청 데이터도 로깅 (민감한 정보 제외)
  if (config.data) {
    const logData = { ...config.data };
    // 비밀번호나 토큰 등 민감한 정보 마스킹
    if (logData.password) logData.password = '***';
    if (logData.token) logData.token = '***';
    if (logData.image && logData.image.length > 100) {
      logData.image = `[Base64 이미지 데이터 ${logData.image.length}자]`;
    }
    console.log(`📦 요청 데이터:`, logData);
  } else {
    console.log(`📦 요청 데이터: 없음`);
  }
  
  // 요청 헤더 정보 (민감한 정보 제외)
  const headers = { ...config.headers };
  if (headers.Authorization) {
    headers.Authorization = `Bearer ${token?.substring(0, 20)}...`;
  }
  console.log(`📋 요청 헤더:`, headers);
  
  console.log('─'.repeat(50)); // 구분선
  
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase();
    const url = response.config.url;
    const status = response.status;
    const statusText = response.statusText;
    
    // 성공 응답 로깅
    console.log(`✅ API 응답 성공: ${method} ${url}`);
    console.log(`📊 상태: ${status} (${statusText})`);
    console.log(`📦 응답 데이터:`, response.data);
    console.log(`⏱️ 응답 시간:`, new Date().toLocaleTimeString());
    
    // 응답 헤더에 유용한 정보가 있다면 로깅
    if (response.headers['content-type']) {
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
    }
    
    console.log('─'.repeat(50)); // 구분선
    
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const statusText = error.response?.statusText;
    const errorData = error.response?.data;
    
    // 상세한 에러 로깅
    console.error(`❌ API 응답 에러: ${method} ${url}`);
    console.error(`📊 상태 코드: ${status} (${statusText})`);
    console.error(`📝 에러 메시지:`, errorData);
    console.error(`⏱️ 에러 발생 시간:`, new Date().toLocaleTimeString());
    
    // 요청 헤더 정보도 로깅 (토큰 확인용)
    if (error.config?.headers) {
      const authHeader = error.config.headers.Authorization;
      if (authHeader) {
        console.error(`🔑 요청에 포함된 토큰: ${authHeader.substring(0, 30)}...`);
      } else {
        console.error(`🚫 요청에 토큰이 포함되지 않음`);
      }
    }
    
    // 네트워크 에러인지 확인
    if (!error.response) {
      console.error(`🌐 네트워크 에러: 서버에 연결할 수 없습니다`);
      console.error(`📡 요청 URL: ${error.config?.baseURL}${error.config?.url}`);
      console.error(`🔍 에러 코드: ${error.code}`);
      console.error(`📄 에러 메시지: ${error.message}`);
    }
    
    // 401 에러 처리
    if (status === 401) {
      console.error('🔒 인증 실패 - 토큰을 확인하세요');
      const currentToken = localStorage.getItem('authToken');
      if (currentToken) {
        console.error('💾 현재 저장된 토큰:', currentToken.substring(0, 20) + '...');
        console.error('🗓️ 토큰 만료 여부 확인 필요');
      } else {
        console.error('❌ localStorage에 저장된 토큰이 없습니다');
      }
      
      // 자동 로그아웃 처리
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      console.error('🚪 자동 로그아웃 처리됨');
      window.location.href = '/login';
    }
    
    // 403 에러 처리
    if (status === 403) {
      console.error('🚫 권한 없음 - 접근이 거부되었습니다');
    }
    
    // 404 에러 처리
    if (status === 404) {
      console.error('🔍 리소스를 찾을 수 없습니다');
    }
    
    // 500 에러 처리
    if (status >= 500) {
      console.error('🔥 서버 내부 에러 - 백엔드 서버 상태를 확인하세요');
    }
    
    console.error('─'.repeat(50)); // 구분선
    
    return Promise.reject(error);
  }
);

export default api;

// 백엔드 서버 연결 상태 확인 함수
export const checkServerHealth = async () => {
  try {
    console.log('🏥 백엔드 서버 상태 확인 중...');
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ 백엔드 서버 정상 작동 중');
      return true;
    } else {
      console.error(`❌ 백엔드 서버 응답 에러: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ 백엔드 서버에 연결할 수 없습니다:', error.message);
    console.error(`📡 시도한 URL: ${API_BASE_URL}/health`);
    return false;
  }
};
