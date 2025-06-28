import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profile';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';
import MatchRequestModal from '../components/MatchRequestModal';
import './MentorList.css';

const MentorList = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [orderBy, setOrderBy] = useState('');
  const [requestingMentorId, setRequestingMentorId] = useState(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showMatchRequestModal, setShowMatchRequestModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);

  useEffect(() => {
    // 멘티만 접근 가능
    if (user?.role !== 'mentee') {
      navigate('/profile');
      return;
    }
    loadMentors();
  }, [user, navigate, skillFilter, orderBy]);

  const loadMentors = async () => {
    try {
      setLoading(true);
      const data = await profileService.getMentors(skillFilter, orderBy);
      setMentors(data);
    } catch (err) {
      setError('멘토 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = () => {
    loadMentors();
  };

  const clearFilters = () => {
    setSkillFilter('');
    setOrderBy('');
  };

  // 현재 로드된 멘토들의 모든 기술 스택 추출
  const getAllSkills = () => {
    const allSkills = new Set();
    mentors.forEach(mentor => {
      if (mentor.profile?.skills) {
        mentor.profile.skills.forEach(skill => allSkills.add(skill));
      }
    });
    return Array.from(allSkills).sort();
  };

  const handleSkillSelect = (skill) => {
    setSkillFilter(skill);
    setShowAllSkills(false);
    setOrderBy('skill');
    // 자동으로 검색 실행
    setTimeout(() => handleSearch(), 100);
  };

  const handleMatchRequest = async (mentorId) => {
    const mentor = mentors.find(m => m.id === mentorId);
    if (!mentor) return;
    
    setSelectedMentor(mentor);
    setShowMatchRequestModal(true);
  };

  const handleMatchRequestSubmit = async (message) => {
    if (!selectedMentor) return;
    
    try {
      setRequestingMentorId(selectedMentor.id);
      
      const requestData = {
        mentorId: selectedMentor.id,
        menteeId: user.id,
        message: message
      };

      await profileService.createMatchRequest(requestData);
      setSuccess('매칭 요청이 성공적으로 전송되었습니다!');
      setError('');
      setShowMatchRequestModal(false);
    } catch (err) {
      setError(err.response?.data?.error || '매칭 요청 전송에 실패했습니다.');
      setSuccess('');
    } finally {
      setRequestingMentorId(null);
      setSelectedMentor(null);
    }
  };

  const handleMatchRequestClose = () => {
    setShowMatchRequestModal(false);
    setSelectedMentor(null);
    setRequestingMentorId(null);
  };

  if (user?.role !== 'mentee') {
    return null;
  }

  return (
    <div className="mentor-list-container">
      <div className="mentor-list-header">
        <div className="header-content">
          <h1>멘토 찾기</h1>
          <div className="header-buttons">
            <Link to="/profile" className="profile-button">
              내 프로필
            </Link>
            <button onClick={handleLogout} className="logout-button">
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div className="mentor-list-content">
        <div className="search-section">
          <div className="search-filters">
            <div className="filter-group">
              <label htmlFor="skillFilter">기술 스택으로 검색</label>
              <input
                type="text"
                id="skillFilter"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="예: React, JavaScript, Python"
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="orderBy">정렬 기준</label>
              <select
                id="orderBy"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
              >
                <option value="">기본 정렬</option>
                <option value="name">이름순</option>
                <option value="skill">기술 스택순</option>
              </select>
            </div>
            
            <div className="filter-actions">
              <button onClick={handleSearch} className="search-button">
                검색
              </button>
              <button onClick={clearFilters} className="clear-button">
                초기화
              </button>
            </div>
          </div>

          {/* 테스트 데이터 자동 입력 버튼들 */}
          <div className="test-section">
            <h4>빠른 검색 (테스트용)</h4>
            
            {/* 기술별 검색 */}
            <div className="test-category">
              <span className="category-label">기술별 검색:</span>
              <div className="test-buttons">
                <button 
                  type="button" 
                  className="test-button frontend"
                  onClick={() => {
                    setSkillFilter('React');
                    setOrderBy('skill');
                  }}
                >
                  프론트엔드 (React)
                </button>
                <button 
                  type="button" 
                  className="test-button backend"
                  onClick={() => {
                    setSkillFilter('Node.js');
                    setOrderBy('skill');
                  }}
                >
                  백엔드 (Node.js)
                </button>
                <button 
                  type="button" 
                  className="test-button fullstack"
                  onClick={() => {
                    setSkillFilter('JavaScript');
                    setOrderBy('name');
                  }}
                >
                  풀스택 (JavaScript)
                </button>
                <button 
                  type="button" 
                  className="test-button python"
                  onClick={() => {
                    setSkillFilter('Python');
                    setOrderBy('skill');
                  }}
                >
                  파이썬 개발자
                </button>
              </div>
            </div>

            {/* 레벨별 추천 */}
            <div className="test-category">
              <span className="category-label">레벨별 추천:</span>
              <div className="test-buttons">
                <button 
                  type="button" 
                  className="test-button beginner"
                  onClick={() => {
                    setSkillFilter('HTML');
                    setOrderBy('name');
                  }}
                >
                  🌱 초급자 추천
                </button>
                <button 
                  type="button" 
                  className="test-button intermediate"
                  onClick={() => {
                    setSkillFilter('React');
                    setOrderBy('skill');
                  }}
                >
                  🚀 중급자 추천
                </button>
                <button 
                  type="button" 
                  className="test-button advanced"
                  onClick={() => {
                    setSkillFilter('Architecture');
                    setOrderBy('skill');
                  }}
                >
                  💎 고급자 추천
                </button>
              </div>
            </div>

            {/* 특수 기능 */}
            <div className="test-category">
              <span className="category-label">특수 기능:</span>
              <div className="test-buttons">
                <button 
                  type="button" 
                  className="test-button mobile"
                  onClick={() => {
                    setSkillFilter('React Native');
                    setOrderBy('name');
                  }}
                >
                  📱 모바일 개발
                </button>
                <button 
                  type="button" 
                  className="test-button data"
                  onClick={() => {
                    setSkillFilter('Machine Learning');
                    setOrderBy('skill');
                  }}
                >
                  📊 데이터 사이언스
                </button>
                <button 
                  type="button" 
                  className="test-button devops"
                  onClick={() => {
                    setSkillFilter('Docker');
                    setOrderBy('name');
                  }}
                >
                  ⚙️ DevOps
                </button>
                <button 
                  type="button" 
                  className="test-button auto-search"
                  onClick={() => {
                    const skills = ['React', 'Node.js', 'Python', 'JavaScript', 'TypeScript'];
                    const randomSkill = skills[Math.floor(Math.random() * skills.length)];
                    setSkillFilter(randomSkill);
                    setOrderBy('skill');
                    // 자동으로 검색까지 실행
                    setTimeout(() => handleSearch(), 100);
                  }}
                >
                  🎲 랜덤 검색
                </button>
                <button 
                  type="button" 
                  className="test-button skills-toggle"
                  onClick={() => setShowAllSkills(!showAllSkills)}
                >
                  {showAllSkills ? '📋 기술 목록 닫기' : '📋 전체 기술 보기'}
                </button>
              </div>
            </div>

            {/* 전체 기술 스택 목록 */}
            {showAllSkills && (
              <div className="skills-dropdown">
                <h5>사용 가능한 기술 스택 (총 {getAllSkills().length}개)</h5>
                <div className="skills-list">
                  {getAllSkills().map((skill, index) => (
                    <button 
                      key={index}
                      className="skill-chip"
                      onClick={() => handleSkillSelect(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                  {getAllSkills().length === 0 && (
                    <p className="no-skills">멘토 데이터를 먼저 로드해주세요</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {loading ? (
          <div className="loading">멘토 목록을 불러오는 중...</div>
        ) : (
          <div className="mentors-grid">
            {mentors.length === 0 ? (
              <div className="no-mentors">
                <p>조건에 맞는 멘토가 없습니다.</p>
                <button onClick={clearFilters} className="clear-filters-button">
                  모든 멘토 보기
                </button>
              </div>
            ) : (
              mentors.map((mentor) => (
                <div key={mentor.id} className="mentor-card">
                  <div className="mentor-image">
                    <img 
                      src={mentor.profile?.imageUrl 
                        ? `http://localhost:8080/api${mentor.profile.imageUrl}`
                        : 'https://placehold.co/500x500.jpg?text=MENTOR'
                      }
                      alt={mentor.profile?.name || '멘토'}
                    />
                  </div>
                  
                  <div className="mentor-info">
                    <h3>{mentor.profile?.name || '이름 없음'}</h3>
                    <p className="mentor-email">{mentor.email}</p>
                    
                    {mentor.profile?.bio && (
                      <p className="mentor-bio">{mentor.profile.bio}</p>
                    )}
                    
                    {mentor.profile?.skills && mentor.profile.skills.length > 0 && (
                      <div className="mentor-skills">
                        {mentor.profile.skills.map((skill, index) => (
                          <span key={index} className="skill-tag">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="mentor-actions">
                      <button 
                        className="contact-button"
                        onClick={() => handleMatchRequest(mentor.id)}
                        disabled={requestingMentorId === mentor.id}
                      >
                        {requestingMentorId === mentor.id ? '요청 중...' : '매칭 요청'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 매칭 요청 모달 */}
      <MatchRequestModal
        isOpen={showMatchRequestModal}
        onClose={handleMatchRequestClose}
        mentor={selectedMentor}
        onSubmit={handleMatchRequestSubmit}
        isLoading={requestingMentorId !== null}
      />
    </div>
  );
};

export default MentorList;
