import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  File,
  Star,
  Share2,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './MyDocuments.css';
import DocumentUpload from '../components/DocumentUpload';

const MyDocuments = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [isVisible, setIsVisible] = useState(false);

  // Расширенный список типов документов для загрузки
  const documentTypes = [
    { 
      id: 'passport', 
      name: 'Паспорт РФ', 
      icon: '🛂',
      description: 'Серия, номер, ФИО, дата рождения',
      fields: ['series', 'number', 'firstName', 'lastName', 'middleName', 'birthDate', 'birthPlace', 'issueDate', 'issuedBy'],
      color: '#667eea'
    },
    { 
      id: 'snils', 
      name: 'СНИЛС', 
      icon: '📋',
      description: 'Номер СНИЛС, ФИО, дата регистрации',
      fields: ['number', 'firstName', 'lastName', 'middleName', 'registrationDate'],
      color: '#28a745'
    },
    { 
      id: 'license', 
      name: 'Водительские права', 
      icon: '🚗',
      description: 'Серия, номер, категории, даты',
      fields: ['series', 'number', 'firstName', 'lastName', 'middleName', 'birthDate', 'categories', 'issueDate', 'expiryDate'],
      color: '#ffc107'
    },
    { 
      id: 'birth', 
      name: 'Свидетельство о рождении', 
      icon: '👶',
      description: 'Серия, номер, ФИО ребенка и родителей',
      fields: ['series', 'number', 'childName', 'childLastName', 'childMiddleName', 'birthDate', 'birthPlace', 'fatherName', 'motherName'],
      color: '#dc3545'
    },
    { 
      id: 'inn', 
      name: 'ИНН', 
      icon: '📊',
      description: 'Идентификационный номер налогоплательщика',
      fields: ['number', 'firstName', 'lastName', 'middleName', 'birthDate', 'issueDate'],
      color: '#17a2b8'
    },
    { 
      id: 'medical', 
      name: 'Медицинская книжка', 
      icon: '🏥',
      description: 'Номер, ФИО, дата выдачи, срок действия',
      fields: ['number', 'firstName', 'lastName', 'middleName', 'issueDate', 'expiryDate', 'issuedBy'],
      color: '#e83e8c'
    },
    { 
      id: 'military', 
      name: 'Военный билет', 
      icon: '🎖️',
      description: 'Серия, номер, звание, категория годности',
      fields: ['series', 'number', 'firstName', 'lastName', 'middleName', 'rank', 'category', 'issueDate'],
      color: '#6f42c1'
    },
    { 
      id: 'foreign', 
      name: 'Загранпаспорт', 
      icon: '🌍',
      description: 'Серия, номер, ФИО, дата выдачи',
      fields: ['series', 'number', 'firstName', 'lastName', 'middleName', 'birthDate', 'issueDate', 'expiryDate'],
      color: '#fd7e14'
    },
    { 
      id: 'contract', 
      name: 'Договор', 
      icon: '📄',
      description: 'Номер, стороны, предмет, сумма',
      fields: ['number', 'date', 'parties', 'subject', 'amount', 'signatureDate'],
      color: '#20c997'
    },
    { 
      id: 'certificate', 
      name: 'Сертификат', 
      icon: '🏆',
      description: 'Номер, ФИО, дата выдачи, организация',
      fields: ['number', 'firstName', 'lastName', 'middleName', 'issueDate', 'issuedBy', 'validUntil'],
      color: '#6c757d'
    },
    { 
      id: 'diploma', 
      name: 'Диплом', 
      icon: '🎓',
      description: 'Серия, номер, ФИО, специальность, дата',
      fields: ['series', 'number', 'firstName', 'lastName', 'middleName', 'specialty', 'issueDate', 'institution'],
      color: '#495057'
    },
    { 
      id: 'insurance', 
      name: 'Страховой полис', 
      icon: '🛡️',
      description: 'Номер, ФИО, тип страхования, срок',
      fields: ['number', 'firstName', 'lastName', 'middleName', 'insuranceType', 'issueDate', 'expiryDate'],
      color: '#198754'
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    
    // Загрузка документов из localStorage
    const savedDocuments = localStorage.getItem('myDocuments');
    if (savedDocuments) {
      setDocuments(JSON.parse(savedDocuments));
    }
  }, []);

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || doc.type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
        case 'size':
          return parseFloat(a.size) - parseFloat(b.size);
        default:
          return 0;
      }
    });

  const handleDocumentClick = (document) => {
    setSelectedDocument(document);
  };

  const handleDeleteDocument = (documentId) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    setDocuments(updatedDocuments);
    localStorage.setItem('documents', JSON.stringify(updatedDocuments));
  };

  const handleDownloadDocument = (document) => {
    const blob = new Blob([document.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = document.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTextExtracted = (text, filename) => {
    // Добавляем новый документ в список
    const newDocument = {
      id: Date.now(),
      name: filename,
      content: text,
      uploadedAt: new Date().toISOString(),
      type: uploadDocumentType?.id || 'legal',
      status: 'analyzed',
      size: `${(text.length / 1024).toFixed(1)} KB`
    };
    
    setDocuments(prev => [newDocument, ...prev]);
    localStorage.setItem('myDocuments', JSON.stringify([newDocument, ...documents]));
    
    // Очищаем состояние загрузки
    setShowUpload(false);
    setUploadDocumentType(null);
  };

  const handleCloseUpload = () => {
    setShowUpload(false);
    setUploadDocumentType(null);
  };

  const handleDocumentTypeSelect = (documentType) => {
    setUploadDocumentType(documentType);
    setShowUpload(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'analyzed':
        return <CheckCircle size={16} className="status-icon status-icon--success" />;
      case 'pending':
        return <Clock size={16} className="status-icon status-icon--warning" />;
      case 'error':
        return <AlertCircle size={16} className="status-icon status-icon--error" />;
      default:
        return <Info size={16} className="status-icon status-icon--info" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'analyzed':
        return 'Проанализирован';
      case 'pending':
        return 'В обработке';
      case 'error':
        return 'Ошибка';
      default:
        return 'Неизвестно';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'contract':
        return <FileText size={20} />;
      case 'legal':
        return <File size={20} />;
      default:
        return <File size={20} />;
    }
  };

  const getComplianceColor = (compliance) => {
    switch (compliance) {
      case 'high':
        return '#28a745';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className={`my-documents-page ${isVisible ? 'my-documents-page--visible' : ''}`}>
      {/* Header Section */}
      <section className="my-documents-header">
        <div className="my-documents-header__background">
          <div className="my-documents-header__gradient"></div>
        </div>
        
        <div className="my-documents-header__content">
          <div className="my-documents-header__info">
            <h1 className="my-documents-header__title">Мои документы</h1>
            <p className="my-documents-header__subtitle">
              Загружайте популярные российские документы с автоматическим распознаванием полей
            </p>
            <div className="my-documents-header__stats">
              <div className="stat-item">
                <FileText size={20} />
                <span>{documents.length} документов</span>
              </div>
              <div className="stat-item">
                <CheckCircle size={20} />
                <span>{documents.filter(d => d.status === 'analyzed').length} проанализировано</span>
              </div>
              <div className="stat-item">
                <Clock size={20} />
                <span>{documents.filter(d => d.status === 'pending').length} в обработке</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Document Types Section */}
      <section className="document-types-section">
        <div className="document-types-container">
          <div className="document-types-header">
            <h2>Популярные документы РФ</h2>
            <p>Выберите тип документа для загрузки и автоматического распознавания полей</p>
          </div>
          
          <div className="document-types-grid">
            {documentTypes.map((docType) => (
              <div
                key={docType.id}
                className="document-type-card"
                style={{ '--card-color': docType.color }}
                onClick={() => handleDocumentTypeSelect(docType)}
              >
                <div className="document-type-header">
                  <div className="document-type-icon">
                    <span>{docType.icon}</span>
                  </div>
                  <div className="document-type-action">
                    <Upload size={20} />
                    <span>Загрузить</span>
                  </div>
                </div>
                
                <div className="document-type-content">
                  <h3 className="document-type-title">{docType.name}</h3>
                  <p className="document-type-description">{docType.description}</p>
                  
                  <div className="document-type-fields">
                    <span className="fields-label">Поля для распознавания:</span>
                    <div className="fields-list">
                      {docType.fields.slice(0, 4).map((field, index) => (
                        <span key={index} className="field-tag">
                          {field === 'series' ? 'Серия' :
                           field === 'number' ? 'Номер' :
                           field === 'firstName' ? 'Имя' :
                           field === 'lastName' ? 'Фамилия' :
                           field === 'middleName' ? 'Отчество' :
                           field === 'birthDate' ? 'Дата рождения' :
                           field === 'birthPlace' ? 'Место рождения' :
                           field === 'issueDate' ? 'Дата выдачи' :
                           field === 'issuedBy' ? 'Кем выдан' :
                           field === 'registrationDate' ? 'Дата регистрации' :
                           field === 'categories' ? 'Категории' :
                           field === 'expiryDate' ? 'Дата окончания' :
                           field === 'childName' ? 'Имя ребенка' :
                           field === 'childLastName' ? 'Фамилия ребенка' :
                           field === 'childMiddleName' ? 'Отчество ребенка' :
                           field === 'fatherName' ? 'Имя отца' :
                           field === 'motherName' ? 'Имя матери' :
                           field === 'date' ? 'Дата' :
                           field === 'parties' ? 'Стороны' :
                           field === 'subject' ? 'Предмет' :
                           field === 'amount' ? 'Сумма' :
                           field === 'signatureDate' ? 'Дата подписания' :
                           field === 'validUntil' ? 'Действует до' :
                           field === 'specialty' ? 'Специальность' :
                           field === 'institution' ? 'Учебное заведение' :
                           field === 'insuranceType' ? 'Тип страхования' :
                           field === 'rank' ? 'Звание' :
                           field === 'category' ? 'Категория' : field}
                        </span>
                      ))}
                      {docType.fields.length > 4 && (
                        <span className="field-tag more">+{docType.fields.length - 4} еще</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="my-documents-controls">
        <div className="my-documents-controls__search">
          <div className="search-input">
            <Search size={20} />
            <input
              type="text"
              placeholder="Поиск по документам..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="my-documents-controls__filters">
          <div className="filter-group">
            <Filter size={16} />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все типы</option>
              <option value="contract">Договоры</option>
              <option value="legal">Юридические документы</option>
            </select>
          </div>
          
          <div className="filter-group">
            <Calendar size={16} />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="date">По дате</option>
              <option value="name">По названию</option>
              <option value="size">По размеру</option>
            </select>
          </div>
        </div>
      </section>

      {/* Documents Grid Section */}
      <section className="my-documents-content">
        {filteredDocuments.length === 0 ? (
          <div className="my-documents-empty">
            <div className="my-documents-empty__icon">
              <FileText size={64} />
            </div>
            <h3 className="my-documents-empty__title">Документы не найдены</h3>
            <p className="my-documents-empty__description">
              {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'Загрузите свой первый документ для анализа'}
            </p>
            {!searchTerm && (
              <button 
                className="my-documents-empty__btn"
                onClick={() => navigate('/documents')}
              >
                <Plus size={20} />
                Перейти к документам
              </button>
            )}
          </div>
        ) : (
          <div className="my-documents-grid">
            {filteredDocuments.map((doc, index) => (
              <div 
                key={doc.id} 
                className="document-card"
              >
                <div className="document-card__header">
                  <div className="document-card__icon">
                    {getTypeIcon(doc.type)}
                  </div>
                  <div className="document-card__status">
                    {getStatusIcon(doc.status)}
                    <span>{getStatusText(doc.status)}</span>
                  </div>
                </div>
                
                <div className="document-card__content">
                  <h3 className="document-card__title">{doc.name}</h3>
                  <p className="document-card__preview">
                    {doc.content.substring(0, 80)}...
                  </p>
                  
                  <div className="document-card__meta">
                    <div className="document-card__date">
                      <Calendar size={14} />
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="document-card__size">
                      <File size={14} />
                      <span>{doc.size}</span>
                    </div>
                  </div>
                  
                </div>
                
                <div className="document-card__actions">
                  <button 
                    className="document-card__btn document-card__btn--view"
                    onClick={() => handleDocumentClick(doc)}
                    title="Просмотреть"
                  >
                    <FileText size={16} />
                  </button>
                  
                  <button 
                    className="document-card__btn document-card__btn--share"
                    title="Поделиться"
                  >
                    <Share2 size={16} />
                  </button>
                  
                  <button
                    className="document-card__btn document-card__btn--delete"
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="Удалить"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Document Upload Modal */}
      {showUpload && (
        <DocumentUpload
          onTextExtracted={handleTextExtracted}
          onClose={handleCloseUpload}
          documentType={uploadDocumentType}
          storageKey="myDocuments"
        />
      )}

      {/* Document Modal */}
      {selectedDocument && (
        <div className="document-modal">
          <div className="document-modal__overlay" onClick={() => setSelectedDocument(null)}></div>
          <div className="document-modal__content">
            <div className="document-modal__header">
              <div className="document-modal__title">
                <h2>{selectedDocument.name}</h2>
                <div className="document-modal__status">
                  {getStatusIcon(selectedDocument.status)}
                  <span>{getStatusText(selectedDocument.status)}</span>
                </div>
              </div>
              <button 
                className="document-modal__close"
                onClick={() => setSelectedDocument(null)}
              >
                ×
              </button>
            </div>
            
            <div className="document-modal__body">
              <div className="document-modal__info">
                <div className="info-item">
                  <Calendar size={16} />
                  <span>Загружен: {new Date(selectedDocument.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <File size={16} />
                  <span>Размер: {selectedDocument.size}</span>
                </div>
                <div className="info-item">
                  <FileText size={16} />
                  <span>Тип: {selectedDocument.type === 'contract' ? 'Договор' : 'Юридический документ'}</span>
                </div>
              </div>
              
              <div className="document-modal__content-text">
                <h4>Содержание документа:</h4>
                <div className="content-text">
                  {selectedDocument.content}
                </div>
              </div>
              
              {/* Анализ документа */}
              {selectedDocument.analysis && (
                <div className="document-modal__analysis">
                  <h4>Результаты анализа:</h4>
                  
                  {/* Сводка анализа */}
                  {selectedDocument.analysis.summary && (
                    <div className="analysis-summary">
                      <h5>Общая оценка:</h5>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span className="summary-label">Тип документа:</span>
                          <span className="summary-value">{selectedDocument.analysis.summary.documentType || 'Не определен'}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Качество:</span>
                          <span className={`summary-value quality-${selectedDocument.analysis.summary.overallQuality || 'average'}`}>
                            {selectedDocument.analysis.summary.overallQuality === 'excellent' ? 'Отличное' :
                             selectedDocument.analysis.summary.overallQuality === 'good' ? 'Хорошее' :
                             selectedDocument.analysis.summary.overallQuality === 'average' ? 'Среднее' : 'Плохое'}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Уровень риска:</span>
                          <span className={`summary-value risk-${selectedDocument.analysis.summary.riskLevel || 'medium'}`}>
                            {selectedDocument.analysis.summary.riskLevel === 'low' ? 'Низкий' :
                             selectedDocument.analysis.summary.riskLevel === 'medium' ? 'Средний' :
                             selectedDocument.analysis.summary.riskLevel === 'high' ? 'Высокий' : 'Критический'}
                          </span>
                        </div>
                      </div>
                      {selectedDocument.analysis.summary.mainIssues && selectedDocument.analysis.summary.mainIssues.length > 0 && (
                        <div className="main-issues">
                          <h6>Основные проблемы:</h6>
                          <ul>
                            {selectedDocument.analysis.summary.mainIssues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Юридические ошибки */}
                  {selectedDocument.analysis.legalErrors && selectedDocument.analysis.legalErrors.length > 0 && (
                    <div className="analysis-section">
                      <h5>🚨 Юридические ошибки:</h5>
                      <div className="errors-list">
                        {selectedDocument.analysis.legalErrors.map((error, index) => (
                          <div key={index} className={`error-item severity-${error.severity || 'medium'}`}>
                            <div className="error-header">
                              <span className="error-type">{error.type}</span>
                              <span className={`error-severity severity-${error.severity || 'medium'}`}>
                                {error.severity === 'critical' ? 'Критическая' :
                                 error.severity === 'high' ? 'Высокая' :
                                 error.severity === 'medium' ? 'Средняя' : 'Низкая'}
                              </span>
                            </div>
                            <div className="error-description">{error.description}</div>
                            {error.location && <div className="error-location">📍 Место: {error.location}</div>}
                            {error.solution && <div className="error-solution">💡 Решение: {error.solution}</div>}
                            {error.legalBasis && <div className="error-basis">⚖️ Правовая основа: {error.legalBasis}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Риски */}
                  {selectedDocument.analysis.risks && selectedDocument.analysis.risks.length > 0 && (
                    <div className="analysis-section">
                      <h5>⚠️ Риски:</h5>
                      <div className="risks-list">
                        {selectedDocument.analysis.risks.map((risk, index) => (
                          <div key={index} className={`risk-item probability-${risk.probability || 'medium'}`}>
                            <div className="risk-header">
                              <span className="risk-category">{risk.category}</span>
                              <span className={`risk-probability probability-${risk.probability || 'medium'}`}>
                                Вероятность: {risk.probability === 'high' ? 'Высокая' :
                                            risk.probability === 'medium' ? 'Средняя' : 'Низкая'}
                              </span>
                            </div>
                            <div className="risk-description">{risk.description}</div>
                            {risk.legalConsequences && <div className="risk-consequences">⚖️ Последствия: {risk.legalConsequences}</div>}
                            {risk.mitigation && <div className="risk-mitigation">🛡️ Меры: {risk.mitigation}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Рекомендации */}
                  {selectedDocument.analysis.recommendations && selectedDocument.analysis.recommendations.length > 0 && (
                    <div className="analysis-section">
                      <h5>💡 Рекомендации:</h5>
                      <div className="recommendations-list">
                        {selectedDocument.analysis.recommendations.map((rec, index) => (
                          <div key={index} className={`recommendation-item priority-${rec.priority || 'medium'}`}>
                            <div className="recommendation-header">
                              <span className="recommendation-category">{rec.category}</span>
                              <span className={`recommendation-priority priority-${rec.priority || 'medium'}`}>
                                {rec.priority === 'high' ? 'Высокий приоритет' :
                                 rec.priority === 'medium' ? 'Средний приоритет' : 'Низкий приоритет'}
                              </span>
                            </div>
                            <div className="recommendation-description">{rec.description}</div>
                            {rec.implementation && <div className="recommendation-implementation">📋 План: {rec.implementation}</div>}
                            {rec.deadline && <div className="recommendation-deadline">⏰ Срок: {rec.deadline}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Экспертное мнение */}
                  {selectedDocument.analysis.expertOpinion && (
                    <div className="analysis-section">
                      <h5>👩‍⚖️ Экспертное мнение:</h5>
                      <div className="expert-opinion">
                        <div className="expert-assessment">{selectedDocument.analysis.expertOpinion.overallAssessment}</div>
                        {selectedDocument.analysis.expertOpinion.criticalPoints && (
                          <div className="critical-points">
                            <h6>Критические моменты:</h6>
                            <ul>
                              {selectedDocument.analysis.expertOpinion.criticalPoints.map((point, index) => (
                                <li key={index}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedDocument.analysis.expertOpinion.nextSteps && (
                          <div className="next-steps">
                            <h6>Следующие шаги:</h6>
                            <ul>
                              {selectedDocument.analysis.expertOpinion.nextSteps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
            </div>
            
            <div className="document-modal__footer">
              <button 
                className="document-modal__btn document-modal__btn--secondary"
                onClick={() => handleDownloadDocument(selectedDocument)}
              >
                <FileText size={16} />
                Скачать
              </button>
              <button 
                className="document-modal__btn document-modal__btn--primary"
                onClick={() => setSelectedDocument(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDocuments; 