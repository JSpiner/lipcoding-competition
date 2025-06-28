import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { profileService } from '../services/profile';
import { checkServerHealth } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 사용자 정보를 /me API에서 가져오는 함수
  const fetchUserInfo = async () => {
    try {
      const userInfo = await profileService.getMyProfile();
      const user = {
        id: userInfo.id,  // API에서 받은 실제 DB PK ID 사용
        email: userInfo.email,
        name: userInfo.profile.name,
        role: userInfo.role,
        profile: userInfo.profile
      };
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      console.log('사용자 정보 업데이트됨:', user);
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      // API 호출 실패시 로그아웃 처리
      authService.logout();
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // 백엔드 서버 상태 확인
      const serverHealthy = await checkServerHealth();
      if (!serverHealthy) {
        console.warn('⚠️ 백엔드 서버에 연결할 수 없습니다. 일부 기능이 제한될 수 있습니다.');
      }
      
      // 페이지 로드시 저장된 사용자 정보 확인
      const currentUser = authService.getCurrentUser();
      const token = authService.getToken();
      
      if (token) {
        console.log('🔍 저장된 토큰 발견:', token.substring(0, 20) + '...');
        if (currentUser && currentUser.id) {
          // 유효한 사용자 정보가 있으면 사용
          console.log('👤 저장된 사용자 정보 사용:', currentUser);
          setUser(currentUser);
          setLoading(false);
        } else {
          // 사용자 정보가 없거나 ID가 없으면 /me API에서 가져오기
          console.log('📡 /me API로 사용자 정보 조회 중...');
          fetchUserInfo().finally(() => setLoading(false));
        }
      } else {
        console.log('🚫 저장된 토큰이 없습니다');
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      // 로그인 후 사용자 정보 가져오기
      await fetchUserInfo();
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authService.signup(userData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    isAuthenticated: !!user && !!authService.getToken(),
    loading,
    fetchUserInfo  // 다른 컴포넌트에서도 사용할 수 있도록 노출
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
