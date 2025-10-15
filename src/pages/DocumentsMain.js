import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, FileCheck, FolderOpen, CheckCircle, Calendar, File, Share2, X } from 'lucide-react';
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
          <h1 className="documents-main-title">Управление документами</h1>
          <p className="documents-main-subtitle">
            Просмотр и управление всеми документами системы
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
          {/* Добавляем детализированную карточку документа */}
          <div className="documents-main-cards">
            <div className="document-card">
              <div className="document-card__header">
                <div className="document-card__icon">
                  <FileText size={20} />
                </div>
                <div className="document-card__status">
                  <CheckCircle size={16} className="status-icon status-icon--success" />
                  <span>Проанализирован</span>
                </div>
              </div>
              <div className="document-card__content">
                <h3 className="document-card__title">photo_2025-10-06 04.14.59.jpeg</h3>
                <p className="document-card__preview">{`{\n  "series": "03 20",\n  "number": "706987",\n  "firstName": "АРТЕМ",\n  ...`}</p>
                <div className="document-card__meta">
                  <div className="document-card__date">
                    <Calendar size={14} />
                    <span>14.10.2025</span>
                  </div>
                  <div className="document-card__size">
                    <File size={14} />
                    <span>0.3 KB</span>
                  </div>
                </div>
                <div className="document-card__analysis">
                  <div className="analysis-item">
                    <span className="analysis-label">Риски:</span>
                    <span className="analysis-value">Недостаточная проверка личностиОшибки в данных документаПроблемы с легитимностью выдачиНеправильное хранение персональных данныхОтсутствие актуальности информации</span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-label">Рекомендации:</span>
                    <span className="analysis-value">Провести проверку подлинности документаОбновить данные о владельцеОбеспечить защиту персональных данныхРегулярно проверять легитимность выдачиВести учет всех выданных документов</span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-label">Соответствие:</span>
                    <span className="analysis-value" style={{ color: '#ffc107' }}>Среднее</span>
                  </div>
                </div>
              </div>
              <div className="document-card__actions">
                <button className="document-card__btn document-card__btn--view" title="Просмотреть">
                  <FileText size={16} />
                </button>
                <button className="document-card__btn document-card__btn--share" title="Поделиться">
                  <Share2 size={16} />
                </button>
                <button className="document-card__btn document-card__btn--delete" title="Удалить">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsMain;


