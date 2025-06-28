import React, { useState } from 'react';
import './MatchRequestModal.css';

const MatchRequestModal = ({ 
  isOpen, 
  onClose, 
  mentor, 
  onSubmit, 
  isLoading 
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('메시지를 입력해주세요.');
      return;
    }
    onSubmit(message.trim());
  };

  const handleClose = () => {
    setMessage('');
    onClose();
  };

  // 테스트 데이터 입력 함수들
  const fillTestMessage = (type) => {
    const testMessages = {
      beginner: `안녕하세요 ${mentor?.profile?.name || '멘토'}님!

개발 공부를 시작한 지 얼마 되지 않은 초보 개발자입니다. 
기본기를 탄탄히 다지고 실무 경험을 쌓고 싶어서 멘토링을 신청드립니다.

현재 상황:
- 프로그래밍 기초 문법 학습 중
- 간단한 토이 프로젝트 경험 있음
- 체계적인 학습 방향 고민 중

도움 받고 싶은 부분:
- 학습 로드맵 설계
- 코드 리뷰 및 피드백
- 실무에서 필요한 기술 스택 조언

열정적으로 배우겠습니다. 감사합니다!`,

      intermediate: `안녕하세요 ${mentor?.profile?.name || '멘토'}님!

개발 경험이 어느 정도 있는 중급 개발자입니다.
더 나은 개발자로 성장하기 위해 멘토링을 요청드립니다.

현재 상황:
- 개발 경력 1-2년 또는 중급 수준
- 기본적인 프로젝트 개발 경험 보유
- 더 깊이 있는 기술 습득 희망

도움 받고 싶은 부분:
- 아키텍처 설계 및 베스트 프랙티스
- 코드 품질 향상 방법
- 실무 프로젝트에서의 문제 해결 접근법
- 커리어 발전 방향 조언

함께 성장할 수 있기를 기대합니다!`,

      career: `안녕하세요 ${mentor?.profile?.name || '멘토'}님!

개발자로서 커리어 전환을 준비하고 있습니다.
실무 진입을 위한 구체적인 가이드가 필요하여 멘토링을 신청합니다.

현재 상황:
- 개발 공부 중 (부트캠프/독학)
- 포트폴리오 프로젝트 준비 중
- 취업 준비 단계

도움 받고 싶은 부분:
- 포트폴리오 프로젝트 방향성
- 이력서 및 기술 면접 준비
- 실무에서 요구하는 기술 수준
- 개발자 취업 시장 이해

실무 경험을 바탕으로 한 조언 부탁드립니다!`,

      project: `안녕하세요 ${mentor?.profile?.name || '멘토'}님!

현재 진행 중인 프로젝트에서 막히는 부분이 있어 도움을 요청드립니다.

프로젝트 개요:
- 웹/앱 개발 프로젝트 진행 중
- 특정 기술 스택 사용 중
- 팀 프로젝트 또는 개인 프로젝트

현재 어려움:
- 기술적 이슈 해결
- 설계 방향성 결정
- 성능 최적화 방법

기대하는 도움:
- 문제 해결 방법론
- 코드 리뷰 및 개선 방향
- 프로젝트 완성도 향상

구체적인 조언 부탁드립니다!`,

      simple: `안녕하세요! 개발 분야에서 성장하고 싶어 멘토링을 신청합니다. 실무 경험을 바탕으로 한 조언 부탁드립니다.`
    };

    setMessage(testMessages[type]);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>매칭 요청</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>
        
        {mentor && (
          <div className="mentor-info">
            <div className="mentor-avatar">
              {mentor.profile?.image ? (
                <img 
                  src={mentor.profile.image} 
                  alt={mentor.profile.name || '멘토'}
                />
              ) : (
                <div className="default-avatar">
                  {(mentor.profile?.name || '멘토')[0]}
                </div>
              )}
            </div>
            <div className="mentor-details">
              <h3>{mentor.profile?.name || '이름 없음'}</h3>
              <p className="bio">{mentor.profile?.bio || '소개글이 없습니다.'}</p>
              <div className="skills">
                {mentor.profile?.skills?.map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="match-request-form">
          <div className="form-group">
            <label htmlFor="message">매칭 요청 메시지</label>
            
            {/* 테스트 데이터 입력 버튼들 */}
            <div className="test-data-buttons">
              <span className="test-label">테스트 메시지:</span>
              <button 
                type="button" 
                className="test-btn beginner"
                onClick={() => fillTestMessage('beginner')}
                disabled={isLoading}
              >
                초보자
              </button>
              <button 
                type="button" 
                className="test-btn intermediate"
                onClick={() => fillTestMessage('intermediate')}
                disabled={isLoading}
              >
                중급자
              </button>
              <button 
                type="button" 
                className="test-btn career"
                onClick={() => fillTestMessage('career')}
                disabled={isLoading}
              >
                커리어전환
              </button>
              <button 
                type="button" 
                className="test-btn project"
                onClick={() => fillTestMessage('project')}
                disabled={isLoading}
              >
                프로젝트도움
              </button>
              <button 
                type="button" 
                className="test-btn simple"
                onClick={() => fillTestMessage('simple')}
                disabled={isLoading}
              >
                간단메시지
              </button>
            </div>

            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="멘토님께 보낼 메시지를 작성해주세요. 어떤 분야에서 도움을 받고 싶은지, 현재 상황 등을 간단히 설명해주세요."
              rows={5}
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? '전송 중...' : '매칭 요청 보내기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MatchRequestModal;
