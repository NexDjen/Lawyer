import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Перенаправление при успешном входе
  useEffect(() => {
    if (user) {
      setIsRedirecting(true);
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Если пользователь уже авторизован при загрузке компонента
  useEffect(() => {
    if (user) {
      setIsRedirecting(true);
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      
      // Принудительное перенаправление через 100ms для надежности
      setTimeout(() => {
        setIsRedirecting(true);
        navigate('/', { replace: true });
      }, 100);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Windex-Юрист</h1>
          <p>Вход в систему</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Введите ваш email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите ваш пароль"
            />
          </div>
          
          <button type="submit" disabled={isLoading || isRedirecting} className="login-button">
            {isRedirecting ? 'Перенаправляем...' : isLoading ? 'Входим...' : 'Войти'}
          </button>
          
        </form>
        
        <div className="login-footer">
          <p>
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 