import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profile';
import { useNavigate, Link } from 'react-router-dom';
import './MatchRequests.css';

const MatchRequests = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [userProfiles, setUserProfiles] = useState({}); // 사용자 프로필 캐시

  useEffect(() => {
    if (user?.role === 'mentor') {
      loadIncomingRequests();
    } else if (user?.role === 'mentee') {
      loadOutgoingRequests();
    }
  }, [user]);

  // 사용자 프로필 정보 가져오기 (ID로)
  const getUserProfile = async (userId, role) => {
    try {
      // 이미 캐시된 정보가 있으면 반환
      if (userProfiles[userId]) {
        return userProfiles[userId];
      }

      let profile = {
        id: userId,
        name: `${role === 'mentor' ? '멘토' : '멘티'} ${userId}`,
        role: role
      };

      // 멘토인 경우 멘토 목록에서 정보 가져오기 시도
      if (role === 'mentor') {
        try {
          const mentorData = await profileService.getMentors();
          const mentor = mentorData.find(m => m.id === userId);
          if (mentor) {
            profile = {
              id: mentor.id,
              name: mentor.profile.name,
              role: mentor.role
            };
          }
        } catch (err) {
          console.log('멘토 정보 조회 실패, 기본값 사용:', err);
        }
      }

      // 캐시에 저장
      setUserProfiles(prev => ({
        ...prev,
        [userId]: profile
      }));

      return profile;
    } catch (err) {
      console.error('사용자 프로필 조회 실패:', err);
      return {
        id: userId,
        name: `${role === 'mentor' ? '멘토' : '멘티'} ${userId}`,
        role: role
      };
    }
  };

  const loadIncomingRequests = async () => {
    try {
      console.log('🔥 받은 매칭 요청 조회 시작');
      const data = await profileService.getIncomingMatchRequests();
      // API는 배열을 직접 반환함
      const requestList = Array.isArray(data) ? data : [];
      
      // 각 요청에 대해 멘티 정보 추가
      const requestsWithProfiles = await Promise.all(
        requestList.map(async (request) => {
          const menteeProfile = await getUserProfile(request.menteeId, 'mentee');
          return {
            ...request,
            mentee: menteeProfile
          };
        })
      );
      
      setRequests(requestsWithProfiles);
      console.log('✅ 받은 매칭 요청 조회 성공:', requestsWithProfiles);
    } catch (err) {
      setError('매칭 요청을 불러오는데 실패했습니다.');
      console.error('❌ 받은 매칭 요청 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOutgoingRequests = async () => {
    try {
      console.log('🔥 보낸 매칭 요청 조회 시작');
      const data = await profileService.getOutgoingMatchRequests();
      // API는 배열을 직접 반환함
      const requestList = Array.isArray(data) ? data : [];
      
      // 각 요청에 대해 멘토 정보 추가
      const requestsWithProfiles = await Promise.all(
        requestList.map(async (request) => {
          const mentorProfile = await getUserProfile(request.mentorId, 'mentor');
          return {
            ...request,
            mentor: mentorProfile
          };
        })
      );
      
      setRequests(requestsWithProfiles);
      console.log('✅ 보낸 매칭 요청 조회 성공:', requestsWithProfiles);
    } catch (err) {
      setError('매칭 요청을 불러오는데 실패했습니다.');
      console.error('❌ 보낸 매칭 요청 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      setError('');
      setSuccess('');

      console.log('🔥 매칭 요청 수락 시작:', requestId);
      await profileService.acceptMatchRequest(requestId);
      setSuccess('매칭 요청을 수락했습니다!');
      console.log('✅ 매칭 요청 수락 성공');
      
      // 요청 목록 새로고침
      await loadIncomingRequests();
    } catch (err) {
      setError(err.response?.data?.error || '매칭 요청 수락에 실패했습니다.');
      console.error('❌ 매칭 요청 수락 실패:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      setError('');
      setSuccess('');

      console.log('🔥 매칭 요청 거절 시작:', requestId);
      await profileService.rejectMatchRequest(requestId);
      setSuccess('매칭 요청을 거절했습니다.');
      console.log('✅ 매칭 요청 거절 성공');
      
      // 요청 목록 새로고침
      await loadIncomingRequests();
    } catch (err) {
      setError(err.response?.data?.error || '매칭 요청 거절에 실패했습니다.');
      console.error('❌ 매칭 요청 거절 실패:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      setError('');
      setSuccess('');

      if (!confirm('정말로 매칭 요청을 취소하시겠습니까?')) {
        setProcessingRequestId(null);
        return;
      }

      console.log('🔥 매칭 요청 취소 시작:', requestId);
      await profileService.cancelMatchRequest(requestId);
      setSuccess('매칭 요청을 취소했습니다.');
      console.log('✅ 매칭 요청 취소 성공');
      
      // 요청 목록 새로고침
      await loadOutgoingRequests();
    } catch (err) {
      setError(err.response?.data?.error || '매칭 요청 취소에 실패했습니다.');
      console.error('❌ 매칭 요청 취소 실패:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '대기 중';
      case 'accepted': return '수락됨';
      case 'rejected': return '거절됨';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  if (!user) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="match-requests-container">
      <div className="match-requests-header">
        <div className="header-content">
          <h1>
            {user.role === 'mentor' ? '받은 매칭 요청' : '보낸 매칭 요청'}
          </h1>
          <div className="header-buttons">
            <Link to="/profile" className="profile-button">
              내 프로필
            </Link>
            {user.role === 'mentee' && (
              <Link to="/mentors" className="mentors-button">
                멘토 찾기
              </Link>
            )}
            <button onClick={handleLogout} className="logout-button">
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div className="match-requests-content">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {loading ? (
          <div className="loading">매칭 요청을 불러오는 중...</div>
        ) : requests.length === 0 ? (
          <div className="no-requests">
            {user.role === 'mentor' 
              ? '아직 받은 매칭 요청이 없습니다.' 
              : '아직 보낸 매칭 요청이 없습니다.'
            }
          </div>
        ) : (
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-info">
                  <div className="request-header">
                    <h3>
                      {user.role === 'mentor' 
                        ? `${request.mentee?.name || '이름 없음'} (멘티)`
                        : `${request.mentor?.name || '이름 없음'} (멘토)`
                      }
                    </h3>
                    <span className={`status-badge ${getStatusClass(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </div>
                  
                  <div className="request-message">
                    <h4>메시지:</h4>
                    <p className="message-content">
                      {request.message || '메시지가 없습니다.'}
                    </p>
                  </div>
                  
                  <div className="request-meta">
                    <span className="request-date">
                      요청 ID: {request.id}
                    </span>
                    <span className="request-status">
                      상태: {getStatusText(request.status)}
                    </span>
                  </div>
                </div>

                {/* 멘토용 수락/거절 버튼 */}
                {user.role === 'mentor' && request.status === 'pending' && (
                  <div className="request-actions">
                    <button
                      id="accept"
                      className="accept-button"
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={processingRequestId === request.id}
                    >
                      {processingRequestId === request.id ? '처리 중...' : '수락'}
                    </button>
                    <button
                      id="reject"
                      className="reject-button"
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={processingRequestId === request.id}
                    >
                      {processingRequestId === request.id ? '처리 중...' : '거절'}
                    </button>
                  </div>
                )}

                {/* 멘티용 취소 버튼 */}
                {user.role === 'mentee' && request.status === 'pending' && (
                  <div className="request-actions">
                    <button
                      className="cancel-button"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={processingRequestId === request.id}
                    >
                      {processingRequestId === request.id ? '처리 중...' : '요청 취소'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchRequests;
