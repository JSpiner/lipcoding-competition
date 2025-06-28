import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px'
      }}>
        인증 정보를 확인하는 중...
      </div>
    );
  }

  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated, 'user:', user);

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
