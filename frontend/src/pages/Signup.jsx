import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: 'newuser@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    name: '테스트 사용자',
    role: 'mentee'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (!formData.role) {
      setError('역할을 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      const signupData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role
      };
      
      await signup(signupData);
      navigate('/login', { 
        state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' }
      });
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-form">
        <h1>회원가입</h1>
        <p className="subtitle">멘토-멘티 매칭 서비스에 가입하세요</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
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
              placeholder="비밀번호를 입력하세요 (6자 이상)"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="role">역할</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="">역할을 선택하세요</option>
              <option value="mentor">멘토 (Mentor)</option>
              <option value="mentee">멘티 (Mentee)</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
        
        <div className="test-buttons">
          <button 
            type="button" 
            className="test-button"
            onClick={() => setFormData({
              email: 'mentor@test.com',
              password: 'password123',
              confirmPassword: 'password123',
              name: '테스트 멘토',
              role: 'mentor'
            })}
          >
            멘토로 가입
          </button>
          <button 
            type="button" 
            className="test-button"
            onClick={() => setFormData({
              email: 'mentee@test.com',
              password: 'password123',
              confirmPassword: 'password123',
              name: '테스트 멘티',
              role: 'mentee'
            })}
          >
            멘티로 가입
          </button>
        </div>
        
        <div className="login-link">
          <p>
            이미 계정이 있으신가요? 
            <Link to="/login"> 로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
