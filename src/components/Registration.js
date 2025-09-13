import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './Registration.css';

const Registration = () => {
  const [userType, setUserType] = useState('individual'); // 'individual' или 'legal'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  // Поля для юридического лица
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [ogrn, setOgrn] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Валидация общих полей
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (name.length < 2) {
      setError('Имя должно содержать минимум 2 символа');
      return;
    }

    // Валидация для юридических лиц
    if (userType === 'legal') {
      if (companyName.length < 2) {
        setError('Название организации должно содержать минимум 2 символа');
        return;
      }
      if (inn.length !== 10 && inn.length !== 12) {
        setError('ИНН должен содержать 10 или 12 цифр');
        return;
      }
      if (ogrn.length !== 13 && ogrn.length !== 15) {
        setError('ОГРН должен содержать 13 или 15 цифр');
        return;
      }
      if (contactPerson.length < 2) {
        setError('ФИО контактного лица должно содержать минимум 2 символа');
        return;
      }
      if (position.length < 2) {
        setError('Должность должна содержать минимум 2 символа');
        return;
      }
    }

    setIsLoading(true);

    try {
      const userData = {
        email,
        password,
        name,
        userType,
        ...(userType === 'legal' && {
          companyName,
          inn,
          ogrn,
          contactPerson,
          position
        })
      };

      await register(userData);
      navigate('/login');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-page">
      <div className="registration-container">
        <div className="registration-header">
          <h1>⚖️ Галина - AI Юрист</h1>
          <p>Регистрация нового аккаунта</p>
        </div>

        {/* Выбор типа пользователя */}
        <div className="user-type-selector">
          <div className="user-type-buttons">
            <button
              type="button"
              className={`user-type-button ${userType === 'individual' ? 'active' : ''}`}
              onClick={() => setUserType('individual')}
            >
              🧑 Физическое лицо
            </button>
            <button
              type="button"
              className={`user-type-button ${userType === 'legal' ? 'active' : ''}`}
              onClick={() => setUserType('legal')}
            >
              🏢 Юридическое лицо
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="name">
              {userType === 'individual' ? 'Имя:' : 'Имя представителя:'}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={userType === 'individual' ? 'Введите ваше имя' : 'Введите ФИО представителя'}
            />
          </div>
          
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
              placeholder="Введите пароль (минимум 6 символов)"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Подтвердите пароль:</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Подтвердите пароль"
            />
          </div>

          {/* Дополнительные поля для юридических лиц */}
          {userType === 'legal' && (
            <>
              <div className="form-section-title">
                <h3>📋 Данные организации</h3>
              </div>

              <div className="form-group">
                <label htmlFor="companyName">Название организации:</label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Введите полное название организации"
                />
              </div>

              <div className="form-group">
                <label htmlFor="inn">ИНН:</label>
                <input
                  id="inn"
                  type="text"
                  value={inn}
                  onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="10 или 12 цифр"
                  maxLength="12"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ogrn">ОГРН/ОГРНИП:</label>
                <input
                  id="ogrn"
                  type="text"
                  value={ogrn}
                  onChange={(e) => setOgrn(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="13 или 15 цифр"
                  maxLength="15"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactPerson">Контактное лицо:</label>
                <input
                  id="contactPerson"
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  placeholder="ФИО контактного лица"
                />
              </div>

              <div className="form-group">
                <label htmlFor="position">Должность:</label>
                <input
                  id="position"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  required
                  placeholder="Укажите должность"
                />
              </div>
            </>
          )}

          <button type="submit" disabled={isLoading} className="registration-button">
            {isLoading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <div className="registration-footer">
          <p>
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registration; 