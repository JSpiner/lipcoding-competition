import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profile';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 기본 이미지 설정
  const defaultImage = user?.role === 'mentor' 
    ? 'https://placehold.co/500x500.jpg?text=MENTOR'
    : 'https://placehold.co/500x500.jpg?text=MENTEE';

  // 인증된 이미지 로딩 훅 사용
  const { imageSrc, loading: imageLoading, error: imageError } = useAuthenticatedImage(
    profileData?.profile?.imageUrl,
    defaultImage
  );

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileService.getMyProfile();
      setProfileData(data);
    } catch (err) {
      setError('프로필 정보를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">프로필 정보를 불러오는 중...</div>;
  }

  if (!user) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>내 프로필</h1>
          <div className="header-buttons">
            {user.role === 'mentee' && (
              <Link to="/mentors" className="mentors-button">
                멘토 찾기
              </Link>
            )}
            {user.role === 'mentor' && (
              <Link to="/requests" className="requests-button">
                받은 요청
              </Link>
            )}
            {user.role === 'mentee' && (
              <Link to="/requests" className="requests-button">
                내 요청
              </Link>
            )}
            <Link to="/profile" className="edit-button">
              프로필 편집
            </Link>
            <button onClick={handleLogout} className="logout-button">
              로그아웃
            </button>
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="profile-content">
          <div className="profile-main">
            <div className="profile-image">
              {imageLoading && <div className="image-loading">이미지 로딩 중...</div>}
              <img 
                src={imageSrc} 
                alt="프로필" 
                onError={(e) => {
                  console.warn('이미지 로드 실패, 기본 이미지로 대체');
                  e.target.src = defaultImage;
                }}
              />
              {imageError && <div className="image-error">이미지 로드 실패</div>}
            </div>
            
            <div className="profile-info">
              <h2>{profileData?.profile?.name || '이름을 설정해주세요'}</h2>
              <p className="role-badge">
                {user.role === 'mentor' ? '멘토' : '멘티'}
              </p>
              <p className="email">{user.email}</p>
              
              {profileData?.profile?.bio ? (
                <div className="bio">
                  <h4>소개</h4>
                  <p>{profileData.profile.bio}</p>
                </div>
              ) : (
                <div className="bio">
                  <p className="no-bio">소개글을 작성해주세요.</p>
                </div>
              )}
              
              {user.role === 'mentor' && (
                <div className="skills">
                  <h4>기술 스택</h4>
                  {profileData?.profile?.skills && profileData.profile.skills.length > 0 ? (
                    <div className="skills-list">
                      {profileData.profile.skills.map((skill, index) => (
                        <span key={index} className="skill-tag">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="no-skills">기술 스택을 추가해주세요.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {(!profileData?.profile?.name || !profileData?.profile?.bio) && (
            <div className="setup-notice">
              <p>
                <strong>프로필을 완성해주세요!</strong><br />
                프로필 정보를 입력하면 더 나은 매칭을 받을 수 있습니다.
              </p>
              <Link to="/profile" className="setup-button">
                지금 설정하기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
