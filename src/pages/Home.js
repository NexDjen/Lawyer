import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Users,
  ArrowRight,
  Bot,
  Shield,
  Zap,
  Star,
  CheckCircle,
  Play,
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
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      id: 'chat',
      icon: <Bot size={32} />,
      title: 'ИИ-юрист Галина',
      description: 'Задайте любой юридический вопрос и получите профессиональный ответ с анализом ситуации',
      path: '/chat',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      gradient: 'from-purple-500 to-blue-500',
      stats: '24/7 доступ',
      features: ['Анализ документов', 'Консультации', 'Синтез речи']
    },
    {
      id: 'documents',
      icon: <FileText size={32} />,
      title: 'Работа с документами',
      description: 'Загружайте и анализируйте юридические документы с помощью ИИ',
      path: '/documents',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      gradient: 'from-cyan-500 to-blue-500',
      stats: 'Быстрая обработка',
      features: ['OCR распознавание', 'Анализ рисков', 'Генерация отчетов']
    },
    {
      id: 'my-documents',
      icon: <Users size={32} />,
      title: 'Мои документы',
      description: 'Управляйте своими документами и историей консультаций',
      path: '/my-documents',
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      gradient: 'from-green-500 to-teal-500',
      stats: 'Безопасное хранение',
      features: ['Облачное хранение', 'Поиск по документам', 'Экспорт данных']
    }
  ];

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

  const handleFeatureClick = (path) => {
    navigate(path);
  };

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
            <button 
              className="hero__btn hero__btn--primary"
              onClick={() => navigate('/chat')}
            >
              <Play size={20} />
              Начать консультацию
            </button>
            <button 
              className="hero__btn hero__btn--secondary"
              onClick={() => navigate('/documents')}
            >
              <Upload size={20} />
              Загрузить документ
            </button>
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

        <div className="features__grid">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`feature-card ${activeFeature === feature.id ? 'feature-card--active' : ''}`}
              onClick={() => handleFeatureClick(feature.path)}
              onMouseEnter={() => setActiveFeature(feature.id)}
              onMouseLeave={() => setActiveFeature(null)}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="feature-card__header">
                <div className="feature-card__icon" style={{ background: feature.color }}>
                  {feature.icon}
                </div>
                <div className="feature-card__stats">{feature.stats}</div>
              </div>
              
              <div className="feature-card__content">
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__description">{feature.description}</p>
                
                <div className="feature-card__features">
                  {feature.features.map((feat, idx) => (
                    <div key={idx} className="feature-card__feature">
                      <CheckCircle size={16} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="feature-card__footer">
                <ArrowRight size={20} className="feature-card__arrow" />
              </div>
            </div>
          ))}
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
          <button 
            className="cta__btn"
            onClick={() => navigate('/chat')}
          >
            <Bot size={20} />
            Начать бесплатно
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home; 