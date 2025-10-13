import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, ArrowLeft } from 'lucide-react';
import './Consultation.css';

const Consultation = () => {
  const navigate = useNavigate();

  const handleChatClick = () => {
    navigate('/chat');
  };

  const handleVoiceClick = () => {
    navigate('/lawyer');
  };

  return (
    <div className="consultation-page">
      <div className="container">
        <div className="consultation-header">
          <button
            className="consultation-back-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
            Назад
          </button>
          <h1 className="consultation-title">Выберите тип консультации</h1>
          <p className="consultation-subtitle">
            Получите профессиональную юридическую помощь удобным для вас способом
          </p>
        </div>
          
          <div className="consultation-options">
            <div className="consultation-option" onClick={handleChatClick}>
              <div className="consultation-icon chat-icon">
                <MessageCircle size={48} />
              </div>
              <h3 className="consultation-option-title">Чат с Галиной</h3>
              <p className="consultation-option-description">
                Текстовые консультации с ИИ-юристом Галиной. 
                Быстрые ответы на юридические вопросы, анализ документов.
              </p>
              <div className="consultation-features">
                <span className="feature-tag">Быстро</span>
                <span className="feature-tag">24/7</span>
                <span className="feature-tag">Анализ документов</span>
              </div>
            </div>

            <div className="consultation-option" onClick={handleVoiceClick}>
              <div className="consultation-icon voice-icon">
                <Phone size={48} />
              </div>
              <h3 className="consultation-option-title">Голосовой Юрист</h3>
              <p className="consultation-option-description">
                Голосовые консультации с профессиональным юристом. 
                Персональный подход и детальный разбор сложных ситуаций.
              </p>
              <div className="consultation-features">
                <span className="feature-tag">Персонально</span>
                <span className="feature-tag">Детально</span>
                <span className="feature-tag">Профессионально</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Consultation;


