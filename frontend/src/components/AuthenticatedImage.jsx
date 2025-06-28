import React from 'react';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';

const AuthenticatedImage = ({ imageUrl, alt, className, role }) => {
  const defaultImage = role === 'mentor' 
    ? 'https://placehold.co/500x500.jpg?text=MENTOR'
    : 'https://placehold.co/500x500.jpg?text=MENTEE';

  const { imageSrc, loading, error } = useAuthenticatedImage(imageUrl, defaultImage);

  return (
    <div className={`authenticated-image-container ${className || ''}`}>
      {loading && <div className="image-loading">로딩 중...</div>}
      <img 
        src={imageSrc} 
        alt={alt}
        className={className}
        onError={(e) => {
          console.warn('이미지 로드 실패, 기본 이미지로 대체');
          e.target.src = defaultImage;
        }}
      />
      {error && <div className="image-error">이미지 로드 실패</div>}
    </div>
  );
};

export default AuthenticatedImage;
