import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    password: 'password123'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 회원가입 후 로그인 페이지로 왔을 때 성공 메시지 표시
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(formData);
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>로그인</h1>
        <p className="subtitle">멘토-멘티 매칭 서비스에 오신 것을 환영합니다</p>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="이메일을 입력하세요"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <div className="test-buttons">
          <button 
            type="button" 
            className="test-button"
            onClick={() => setFormData({
              email: 'mentor@test.com',
              password: 'password123'
            })}
          >
            멘토 테스트 계정
          </button>
          <button 
            type="button" 
            className="test-button"
            onClick={() => setFormData({
              email: 'mentee@test.com',
              password: 'password123'
            })}
          >
            멘티 테스트 계정
          </button>
        </div>
        
        <div className="signup-link">
          <p>
            계정이 없으신가요? 
            <Link to="/signup"> 회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
