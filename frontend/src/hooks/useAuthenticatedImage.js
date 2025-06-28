import { useState, useEffect } from 'react';
import { profileService } from '../services/profile';

export const useAuthenticatedImage = (imageUrl, fallbackUrl) => {
  const [imageSrc, setImageSrc] = useState(fallbackUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    let currentBlobUrl = null;

    const loadImage = async () => {
      if (!imageUrl) {
        setImageSrc(fallbackUrl || '');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🖼️ 인증된 이미지 로드 시작:', imageUrl);
        const blobUrl = await profileService.loadImage(imageUrl);
        
        if (!isCancelled) {
          currentBlobUrl = blobUrl;
          setImageSrc(blobUrl);
          console.log('✅ 인증된 이미지 로드 완료');
        } else {
          // 컴포넌트가 언마운트된 경우 blob URL 정리
          profileService.revokeImageUrl(blobUrl);
        }
      } catch (err) {
        console.error('❌ 인증된 이미지 로드 실패:', err);
        if (!isCancelled) {
          setError(err);
          setImageSrc(fallbackUrl || '');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadImage();

    // 클린업 함수
    return () => {
      isCancelled = true;
      if (currentBlobUrl) {
        profileService.revokeImageUrl(currentBlobUrl);
      }
    };
  }, [imageUrl, fallbackUrl]);

  return { imageSrc, loading, error };
};
