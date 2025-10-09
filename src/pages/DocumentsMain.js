import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, FileCheck, FolderOpen } from 'lucide-react';
import './DocumentsMain.css';

const DocumentsMain = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Логирование для диагностики
  console.log('DocumentsMain rendered, current location:', location.pathname);

  return (
    <div className="documents-main-page">
      <div className="container">
        <div className="documents-main-content">
          <h1 className="documents-main-title">Документы</h1>
          <p className="documents-main-subtitle">
            Управляйте документами и получайте помощь в их заполнении
          </p>
          
          <div className="documents-main-options">
            <div 
              className="documents-main-option"
              onClick={() => {
                console.log('Заполнение документов clicked, navigating to /fill-documents');
                navigate('/fill-documents');
              }}
            >
              <div className="documents-main-icon fill-icon">
                <FileText size={48} />
              </div>
              <h3 className="documents-main-option-title">Заполнение документов</h3>
              <p className="documents-main-option-description">
                Автоматическое заполнение документов с помощью ИИ. 
                Загрузите шаблон и получите готовый документ.
              </p>
              <div className="documents-main-features">
                <span className="feature-tag">Автоматически</span>
                <span className="feature-tag">Быстро</span>
                <span className="feature-tag">Точно</span>
              </div>
            </div>

            <div 
              className="documents-main-option"
              onClick={() => {
                console.log('Документы clicked, navigating to /documents-manage');
                navigate('/documents-manage');
              }}
            >
              <div className="documents-main-icon documents-icon">
                <FileCheck size={48} />
              </div>
              <h3 className="documents-main-option-title">Документы</h3>
              <p className="documents-main-option-description">
                Просмотр и управление всеми документами системы. 
                Поиск, фильтрация и организация документов.
              </p>
              <div className="documents-main-features">
                <span className="feature-tag">Поиск</span>
                <span className="feature-tag">Фильтры</span>
                <span className="feature-tag">Организация</span>
              </div>
            </div>

            <div 
              className="documents-main-option"
              onClick={() => {
                console.log('Мои документы clicked, navigating to /my-documents');
                navigate('/my-documents');
              }}
            >
              <div className="documents-main-icon my-documents-icon">
                <FolderOpen size={48} />
              </div>
              <h3 className="documents-main-option-title">Мои документы</h3>
              <p className="documents-main-option-description">
                Ваши личные документы и файлы. 
                Безопасное хранение и быстрый доступ к вашим документам.
              </p>
              <div className="documents-main-features">
                <span className="feature-tag">Личные</span>
                <span className="feature-tag">Безопасно</span>
                <span className="feature-tag">Доступно</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsMain;


