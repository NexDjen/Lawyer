import React, { useContext } from 'react';
import { Brain, Shield, Users, Award, Code, Heart } from 'lucide-react';
import './About.css';
import { LanguageContext } from '../App';
import translations from '../data/translations';

const About = () => {
  const { lang } = useContext(LanguageContext);
  const t = translations[lang] || translations['ru'];
  const features = t.home.features.map((f, i) => ({
    ...f,
    icon: [<Brain size={32} />, <Shield size={32} />, <Users size={32} />, <Award size={32} />][i]
  }));
  const team = [
    { name: t.about.teamDev || 'Команда разработчиков', role: t.about.teamDevRole || 'Техническая реализация', description: t.about.teamDevDesc || 'Опытные разработчики создают надежную и удобную платформу для взаимодействия с AI-юристом.' },
    { name: t.about.teamLaw || 'Юридические эксперты', role: t.about.teamLawRole || 'Правовая экспертиза', description: t.about.teamLawDesc || 'Профессиональные юристы обеспечивают точность и актуальность предоставляемых рекомендаций.' },
    { name: t.about.teamAI || 'AI-специалисты', role: t.about.teamAIRole || 'Машинное обучение', description: t.about.teamAIDesc || 'Эксперты в области искусственного интеллекта разрабатывают и совершенствуют алгоритмы анализа.' }
  ];

  return (
    <div className="about-page">
      <div className="page-content">
        <div className="section">
          <h1 className="section-title">{t.about.title}</h1>
          <p className="section-subtitle">{t.about.subtitle}</p>
        </div>

        <div className="mission-section">
          <div className="card">
            <h2>{t.about.mission}</h2>
            <p>{t.about.missionText}</p>
          </div>
        </div>

        <div className="features-section">
          <h2 className="section-title">{t.about.featuresTitle}</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="team-section">
          <h2 className="section-title">{t.about.teamTitle}</h2>
          <div className="team-grid">
            {team.map((member, index) => (
              <div key={index} className="team-card">
                <div className="team-icon">
                  <Code size={24} />
                </div>
                <h3 className="team-name">{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <p className="team-description">{member.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="technology-section">
          <div className="card">
            <h2>{t.about.techTitle}</h2>
            <div className="tech-list">
              <div className="tech-item">
                <h4>{t.about.techML || 'Машинное обучение'}</h4>
                <p>{t.about.techMLDesc || 'Алгоритмы анализа текста и извлечения ключевой информации из юридических документов'}</p>
              </div>
              <div className="tech-item">
                <h4>{t.about.techNLP || 'Обработка естественного языка'}</h4>
                <p>{t.about.techNLPDesc || 'Понимание и генерация человеческой речи для естественного общения с пользователями'}</p>
              </div>
              <div className="tech-item">
                <h4>{t.about.techDoc || 'Анализ документов'}</h4>
                <p>{t.about.techDocDesc || 'Автоматическое выявление рисков и несоответствий в юридических документах'}</p>
              </div>
              <div className="tech-item">
                <h4>{t.about.techCloud || 'Облачные технологии'}</h4>
                <p>{t.about.techCloudDesc || 'Надежная и масштабируемая инфраструктура для обработки запросов'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-section">
          <div className="card">
            <h2>{t.about.contactTitle}</h2>
            <p>{t.about.contactText || 'У вас есть вопросы или предложения? Мы всегда готовы помочь и улучшить наш сервис.'}</p>
            <div className="contact-info">
              <div className="contact-item">
                <strong>{t.about.contactEmail}:</strong> info@ai-lawyer.ru
              </div>
              <div className="contact-item">
                <strong>{t.about.contactPhone}:</strong> +7 (800) 555-0123
              </div>
              <div className="contact-item">
                <strong>{t.about.contactAddress}:</strong> Москва, ул. Примерная, д. 123
              </div>
            </div>
          </div>
        </div>

        <div className="footer-note">
          <div className="card">
            <div className="footer-content">
              <Heart size={20} />
              <p>{t.about.footer}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About; 