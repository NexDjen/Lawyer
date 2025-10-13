import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Zap,
  Star,
  Users,
  CheckCircle,
  Mic,
  Download,
  Upload,
  Search,
  Sparkles
} from 'lucide-react';
import './Home.css';

// import { LanguageContext } from '../App';
// import translations from '../data/translations';

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const stats = [
    { icon: <Shield size={24} />, label: 'Безопасность', value: '100%' },
    { icon: <Zap size={24} />, label: 'Скорость', value: '< 2 сек' },
    { icon: <Star size={24} />, label: 'Точность', value: '99.9%' },
    { icon: <Users size={24} />, label: 'Пользователей', value: '10K+' }
  ];

  const capabilities = [
    { icon: <Mic size={20} />, text: 'Голосовое управление' },
    { icon: <Search size={20} />, text: 'Умный поиск' },
    { icon: <Download size={20} />, text: 'Экспорт документов' },
    { icon: <Upload size={20} />, text: 'Загрузка файлов' },
    { icon: <Sparkles size={20} />, text: 'ИИ анализ' },
    { icon: <CheckCircle size={20} />, text: 'Проверка документов' }
  ];


  return (
    <div className={`home ${isVisible ? 'home--visible' : ''}`}>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__background">
          <div className="hero__gradient"></div>
          <div className="hero__particles"></div>
        </div>
        
        <div className="hero__content">
          <div className="hero__badge">
            <Sparkles size={16} />
            <span>ИИ-юрист нового поколения</span>
          </div>
          
          <h1 className="hero__title">
            <span className="hero__title-main">Галина</span>
            <span className="hero__title-sub">ваш персональный ИИ-юрист</span>
          </h1>
          
          <p className="hero__description">
            Получите профессиональную юридическую консультацию в любое время. 
            Анализ документов, оценка рисков и практические рекомендации от ИИ-юриста.
          </p>
          
          <div className="hero__actions">
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats__grid">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="stats__item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="stats__icon">{stat.icon}</div>
              <div className="stats__content">
                <div className="stats__value">{stat.value}</div>
                <div className="stats__label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features__header">
          <h2 className="features__title">Возможности платформы</h2>
          <p className="features__subtitle">
            Все необходимые инструменты для работы с юридическими документами
          </p>
        </div>

        <div className="features__info">
          <div className="features__description">
            <h3>Консультация</h3>
            <p>Получите профессиональную юридическую консультацию от ИИ-юриста Галины. Анализ документов, оценка рисков и практические рекомендации.</p>
          </div>
          <div className="features__description">
            <h3>Документы</h3>
            <p>Загружайте и анализируйте юридические документы с помощью ИИ. OCR распознавание, анализ рисков и генерация отчетов.</p>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="capabilities">
        <div className="capabilities__header">
          <h2 className="capabilities__title">Что умеет Галина</h2>
          <p className="capabilities__subtitle">
            Современные технологии для решения ваших юридических задач
          </p>
        </div>

        <div className="capabilities__grid">
          {capabilities.map((capability, index) => (
            <div 
              key={index} 
              className="capability-item"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="capability-item__icon">{capability.icon}</div>
              <span className="capability-item__text">{capability.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta__content">
          <h2 className="cta__title">Готовы начать?</h2>
          <p className="cta__description">
            Присоединяйтесь к тысячам пользователей, которые уже доверяют Галине свои юридические вопросы
          </p>
          <p className="cta__hint">
            Используйте навигацию в верхней части страницы для начала работы
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home; 