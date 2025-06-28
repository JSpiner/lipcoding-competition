import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profile';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';
import './EditProfile.css';

const EditProfile = () => {
  const { user, logout, fetchUserInfo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: [],
    image: null
  });
  
  const [skillInput, setSkillInput] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageProcessing, setImageProcessing] = useState(false);

  // 기본 이미지 상수
  const defaultImage = user?.role === 'mentor' 
    ? 'https://placehold.co/500x500.jpg?text=MENTOR'
    : 'https://placehold.co/500x500.jpg?text=MENTEE';

  // 인증된 이미지 로딩 (프로필에서 가져온 이미지용)
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const { imageSrc: authenticatedImageSrc } = useAuthenticatedImage(
    profileImageUrl,
    defaultImage
  );

  // 초기 기본 이미지 설정
  useEffect(() => {
    if (user && !imagePreview) {
      setImagePreview(defaultImage);
    }
  }, [user, imagePreview, defaultImage]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const profileData = await profileService.getMyProfile();
      setFormData({
        name: profileData.profile?.name || '',
        bio: profileData.profile?.bio || '',
        skills: profileData.profile?.skills || [],
        image: null
      });
      
      // 기본 이미지 설정
      setDefaultImage(profileData);
    } catch (err) {
      setError('프로필 정보를 불러오는데 실패했습니다.');
      // 에러 발생시에도 기본 이미지 설정
      setImagePreview(defaultImage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultImage = (profileData) => {
    if (profileData?.profile?.imageUrl) {
      // 서버에서 가져온 이미지는 인증된 로딩 사용
      setProfileImageUrl(profileData.profile.imageUrl);
      // 인증된 이미지가 로드되면 미리보기에 사용
      if (authenticatedImageSrc && authenticatedImageSrc !== defaultImage) {
        setImagePreview(authenticatedImageSrc);
      }
    } else {
      setImagePreview(defaultImage);
    }
  };

  // 인증된 이미지가 로드되면 미리보기 업데이트
  useEffect(() => {
    if (authenticatedImageSrc && authenticatedImageSrc !== defaultImage && !formData.image) {
      setImagePreview(authenticatedImageSrc);
    }
  }, [authenticatedImageSrc, defaultImage, formData.image]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageProcessing(true);
    setError('');

    // 파일 크기 체크 (1MB)
    if (file.size > 1024 * 1024) {
      setError('이미지 크기는 1MB 이하여야 합니다.');
      setImageProcessing(false);
      return;
    }
    
    // 파일 형식 체크
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setError('JPG 또는 PNG 형식의 이미지만 업로드 가능합니다.');
      setImageProcessing(false);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 이미지 크기 체크 (500x500 ~ 1000x1000)
        if (img.width < 500 || img.height < 500 || img.width > 1000 || img.height > 1000) {
          setError('이미지 크기는 500x500 ~ 1000x1000 픽셀이어야 합니다.');
          setImageProcessing(false);
          return;
        }
        
        if (img.width !== img.height) {
          setError('정사각형 이미지만 업로드 가능합니다.');
          setImageProcessing(false);
          return;
        }
        
        // Base64 데이터 URL에서 실제 Base64 문자열만 추출
        const base64String = event.target.result.split(',')[1];
        
        // 미리보기용 전체 데이터 URL 저장
        setImagePreview(event.target.result);
        
        // 서버 전송용 Base64 문자열만 저장
        setFormData({
          ...formData,
          image: base64String
        });
        
        setError('');
        setSuccess('이미지가 Base64로 인코딩되었습니다.');
        setImageProcessing(false);
        console.log('Base64 이미지 인코딩 완료:', base64String.substring(0, 50) + '...');
      };
      
      img.onerror = () => {
        setError('이미지를 로드할 수 없습니다.');
        setImageProcessing(false);
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = () => {
      setError('파일을 읽을 수 없습니다.');
      setImageProcessing(false);
    };
    
    reader.readAsDataURL(file);
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // 현재 토큰 상태 확인
      const token = localStorage.getItem('authToken');
      console.log('프로필 수정 시작 - 토큰 상태:', token ? `${token.substring(0, 20)}...` : '토큰 없음');
      console.log('현재 사용자 정보:', user);

      const profileData = {
        id: user.id,
        name: formData.name,
        role: user.role,
        bio: formData.bio,
        ...(formData.image && { image: formData.image }),
        ...(user?.role === 'mentor' && { skills: formData.skills })
      };
      
      // Base64 이미지 데이터 확인 로깅
      if (formData.image) {
        console.log('서버로 전송할 Base64 이미지 데이터:', formData.image.substring(0, 100) + '...');
        console.log('Base64 데이터 길이:', formData.image.length, 'characters');
      }
      
      console.log('프로필 업데이트 데이터:', {
        ...profileData,
        image: profileData.image ? `[Base64 데이터 ${profileData.image.length}자]` : undefined
      });
      
      await profileService.updateProfile(profileData);
      setSuccess('프로필이 성공적으로 업데이트되었습니다!');
      
      // 프로필 업데이트 후 AuthContext의 사용자 정보도 새로 고침
      if (typeof fetchUserInfo === 'function') {
        await fetchUserInfo();
      }
    } catch (err) {
      console.error('프로필 업데이트 에러:', err);
      console.error('에러 응답:', err.response);
      setError(err.response?.data?.error || err.response?.data?.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const fillTestData = () => {
    if (user?.role === 'mentor') {
      setFormData({
        ...formData,
        name: '김멘토',
        bio: '5년차 풀스택 개발자입니다. React, Node.js, Python을 주로 다루며, 신입 개발자들의 성장을 도와드리고 싶습니다. 실무 경험을 바탕으로 실질적인 조언을 제공합니다.',
        skills: ['React', 'Node.js', 'Python', 'JavaScript', 'TypeScript'],
        image: null // 이미지는 변경하지 않음
      });
    } else {
      setFormData({
        ...formData,
        name: '이멘티',
        bio: '개발에 관심이 많은 신입 개발자입니다. 웹 개발을 배우고 있으며, 좋은 멘토님과 함께 성장하고 싶습니다. 열심히 배우겠습니다!',
        image: null // 이미지는 변경하지 않음
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">프로필 정보를 불러오는 중...</div>;
  }

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-card">
        <div className="profile-header">
          <h1>프로필 편집</h1>
          <div className="header-buttons">
            <button onClick={() => navigate('/profile')} className="back-button">
              뒤로가기
            </button>
            <button onClick={handleLogout} className="logout-button">
              로그아웃
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <div className="section-header">
              <h3>기본 정보</h3>
              <button 
                type="button" 
                className="test-fill-button"
                onClick={fillTestData}
              >
                테스트 데이터 입력
              </button>
            </div>
            
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="이름을 입력하세요"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">소개글</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                placeholder="자신을 소개해주세요"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>프로필 이미지</h3>
            <div className="image-section">
              <div className="image-preview">
                <img 
                  src={imagePreview} 
                  alt={`${user?.role === 'mentor' ? '멘토' : '멘티'} 프로필`}
                  onError={(e) => {
                    console.warn('이미지 로드 실패, 기본 이미지로 대체');
                    e.target.src = defaultImage;
                  }}
                />
              </div>
              <div className="image-upload">
                <input
                  type="file"
                  id="image"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageChange}
                  disabled={imageProcessing}
                />
                <label htmlFor="image" className={`upload-button ${imageProcessing ? 'processing' : ''}`}>
                  {imageProcessing ? 'Base64 인코딩 중...' : '이미지 선택'}
                </label>
                <p className="image-info">
                  JPG/PNG, 500x500~1000x1000px, 최대 1MB<br />
                  선택한 이미지는 Base64 형식으로 인코딩됩니다.
                </p>
              </div>
            </div>
          </div>

          {user?.role === 'mentor' && (
            <div className="form-section">
              <h3>기술 스택</h3>
              <div className="skills-section">
                <div className="skill-input">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="기술 스택 입력 (예: React, JavaScript)"
                  />
                  <button type="button" onClick={addSkill}>추가</button>
                </div>
                <div className="skills-list">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? '저장 중...' : '프로필 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
