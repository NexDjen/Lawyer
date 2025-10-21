import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Eye,
  Plus,
  Search,
  Upload,
  Filter,
  Calendar,
  Clock,
  File,
  Star,
  Share2,
  CheckCircle,
  AlertCircle,
  Info,
  Camera,
  Scan,
  X,
  MessageCircle,
  Phone
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Documents.css';
import DocumentUpload from '../components/DocumentUpload';
import MigrateDocuments from '../components/MigrateDocuments';
import { AuthContext } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';


const Documents = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Логирование для диагностики
  console.log('Documents component rendered, current location:', location.pathname);
  const [documents, setDocuments] = useState([]);
  const [ocrResults, setOcrResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [showDocumentTypes, setShowDocumentTypes] = useState(false);
  const [, setTick] = useState(0);
  const [showMigration, setShowMigration] = useState(false);

  // Преобразуем содержимое документа к отображаемому тексту
  const toDisplayText = (content) => {
    try {
      if (typeof content === 'string') {
        const trimmed = content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const obj = JSON.parse(trimmed);
          if (obj && typeof obj === 'object') {
            if (typeof obj.recognizedText === 'string' && obj.recognizedText.length) return obj.recognizedText;
            if (typeof obj.text === 'string' && obj.text.length) return obj.text;
            if (obj.extractedData && typeof obj.extractedData.text === 'string' && obj.extractedData.text.length) {
              return obj.extractedData.text;
            }
          }
        }
      }
    } catch (_) { /* ignore parse errors */ }
    return typeof content === 'string' ? content : String(content ?? '');
  };

  // Типы документов для выбора
  const documentTypes = [
    { 
      id: 'passport', 
      name: 'Паспорт РФ', 
      icon: '🛂',
      description: 'Серия, номер, ФИО, дата рождения',
      fields: ['series', 'number', 'firstName', 'lastName', 'middleName', 'birthDate', 'birthPlace', 'issueDate', 'issuedBy']
    },
    { 
      id: 'snils', 
      name: 'СНИЛС', 
      icon: '📋',
      description: 'Номер СНИЛС, ФИО, дата регистрации',
      fields: ['number', 'firstName', 'lastName', 'middleName', 'registrationDate']
    },
    { 
      id: 'license', 
      name: 'Водительские права', 
      icon: '🚗',
      description: 'Серия, номер, категории, даты',
      fields: ['series', 'number', 'firstName', 'lastName', 'middleName', 'birthDate', 'categories', 'issueDate', 'expiryDate']
    },
    { 
      id: 'birth', 
      name: 'Свидетельство о рождении', 
      icon: '👶',
      description: 'Серия, номер, ФИО ребенка и родителей',
      fields: ['series', 'number', 'childName', 'childLastName', 'childMiddleName', 'birthDate', 'birthPlace', 'fatherName', 'motherName']
    }
  ];

  // Load documents from API or localStorage fallback
  const loadDocuments = useCallback(async () => {
    try {
      const userId = user?.id || 'current-user';
      
      // Try to load from API first
      const response = await fetch(buildApiUrl(`documents/user/${userId}`));
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Convert API documents to frontend format
          const convertedDocuments = result.data.map(doc => ({
            id: doc.id,
            name: doc.filename,
            content: doc.extracted_text,
            uploadedAt: doc.created_at,
            type: doc.document_type,
            status: 'analyzed',
            size: `${(doc.file_size / 1024).toFixed(2)} KB`,
            analysis: doc.analysisResult
          }));
          setDocuments(convertedDocuments);
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load documents from API, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    const savedDocuments = localStorage.getItem('documents');
    const allowedStatuses = new Set(['processing','pending','uploaded','analyzed','error','canceled']);
    if (savedDocuments) {
      try {
        const parsed = JSON.parse(savedDocuments);
        const cleaned = parsed.filter(d => allowedStatuses.has(d.status));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('documents', JSON.stringify(cleaned));
        }
        setDocuments(cleaned);
      } catch (_) {
        setDocuments([]);
      }
    } else {
      setDocuments([]);
    }
  }, [user]);

  useEffect(() => {
    setIsVisible(true);
    
    // Проверяем, есть ли параметры для загрузки документа из хедера
    if (location.state?.uploadDocument && location.state?.documentType) {
      setUploadDocumentType(location.state.documentType);
      setShowUpload(true);
      setActiveTab('upload');
    }
    
    // Load documents
    loadDocuments();
    
    // Check if migration is needed
    const hasLocalStorageDocs = localStorage.getItem('documents');
    if (hasLocalStorageDocs) {
      try {
        const parsed = JSON.parse(hasLocalStorageDocs);
        const validDocs = parsed.filter(doc => 
          doc && doc.name && doc.content && 
          ['analyzed', 'uploaded', 'processing', 'pending'].includes(doc.status)
        );
        if (validDocs.length > 0) {
          setShowMigration(true);
        }
      } catch (error) {
        console.error('Error checking localStorage documents:', error);
      }
    }
  }, [location.state, user, loadDocuments]);

  // Периодическое обновление документов из localStorage для актуальных счетчиков и статусов
  useEffect(() => {
    const sync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('documents') || '[]');
        let changed = false;
        const updated = saved.map(d => {
          if (['processing', 'pending'].includes(d.status)) {
            const current = typeof d.progress === 'number' ? d.progress : 10;
            const inc = current < 70 ? 1.0 : current < 90 ? 0.5 : 0.2;
            const next = Math.min(current + inc, 90);
            if (next !== current) {
              changed = true;
              return { ...d, progress: next };
            }
          }
          return d;
        });
        if (changed) {
          localStorage.setItem('documents', JSON.stringify(updated));
        }
        setDocuments(prev => {
          const a = JSON.stringify(prev);
          const b = JSON.stringify(changed ? updated : saved);
          return a === b ? prev : (changed ? updated : saved);
        });
      } catch (_) {}
    };
    const id = setInterval(() => { sync(); setTick(t => t + 1); }, 800);
    return () => clearInterval(id);
  }, []);

  const filteredDocuments = documents
    .filter(doc => {
      // Поиск по названию и содержимому
      const display = toDisplayText(doc.content).toLowerCase();
      const matchesSearch = searchTerm === '' || 
                           doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           display.includes(searchTerm.toLowerCase());
      
      // Фильтрация по типу
      const matchesFilter = filterType === 'all' || doc.type === filterType;
      
      // Фильтрация по статусу
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
      
      return matchesSearch && matchesFilter && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date':
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
        case 'date-old':
          return new Date(a.uploadedAt) - new Date(b.uploadedAt);
        case 'size':
          return parseFloat(a.size || 0) - parseFloat(b.size || 0);
        case 'size-desc':
          return parseFloat(b.size || 0) - parseFloat(a.size || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      }
    });

  const handleDocumentClick = (document) => {
    setSelectedDocument(document);
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      // Try to delete from API first
      const response = await fetch(buildApiUrl(`documents/${documentId}`), {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        const updatedDocuments = documents.filter(doc => doc.id !== documentId);
        setDocuments(updatedDocuments);
        return;
      }
    } catch (error) {
      console.warn('Failed to delete document from API, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    setDocuments(updatedDocuments);
    localStorage.setItem('documents', JSON.stringify(updatedDocuments));
  };

  const handleDownloadDocument = (document) => {
    const blob = new Blob([toDisplayText(document.content)], { type: 'text/plain' });
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
    setOcrResults(prev => [...prev, { filename, text }]);
    // Reload documents from API or localStorage
    loadDocuments();
    setShowUpload(false);
    setUploadDocumentType(null);
  };

  const handleCloseUpload = () => {
    setShowUpload(false);
    setUploadDocumentType(null);
  };

  const handleMigrationComplete = () => {
    setShowMigration(false);
    // Reload documents after migration
    loadDocuments();
  };

  const handleMigrationCancel = () => {
    setShowMigration(false);
  };

  const handleDocumentTypeSelect = (documentType) => {
    setUploadDocumentType(documentType);
    setShowUpload(true);
    setShowDocumentTypes(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'analyzed':
        return <CheckCircle size={16} className="status-icon status-icon--success" />;
      case 'uploaded':
        return <CheckCircle size={16} className="status-icon status-icon--success" />;
      case 'pending':
        return <Clock size={16} className="status-icon status-icon--warning" />;
      case 'processing':
        return <Clock size={16} className="status-icon status-icon--warning" />;
      case 'error':
        return <AlertCircle size={16} className="status-icon status-icon--error" />;
      case 'canceled':
        return <Info size={16} className="status-icon status-icon--info" />;
      default:
        return <Info size={16} className="status-icon status-icon--info" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'analyzed':
        return 'Проанализирован';
      case 'uploaded':
        return 'Проанализирован';
      case 'pending':
        return 'В обработке';
      case 'processing':
        return 'В обработке';
      case 'error':
        return 'Ошибка';
      case 'canceled':
        return 'Отменен';
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
    <div className={`documents-page ${isVisible ? 'documents-page--visible' : ''}`}>
      {/* Migration Component */}
      {showMigration && (
        <MigrateDocuments 
          onComplete={handleMigrationComplete}
          onCancel={handleMigrationCancel}
        />
      )}
      
      {/* Header Section */}
      <section className="documents-header">
        <div className="documents-header__background">
          <div className="documents-header__gradient"></div>
        </div>

        <div className="documents-header__content">
          <div className="documents-header__info">
            <h1 className="documents-header__title">Мои документы</h1>
            <p className="documents-header__subtitle">
              Загружайте, анализируйте и управляйте юридическими документами с помощью ИИ
            </p>
              <div className="documents-header__stats">
                <div className="stat-item">
                  <FileText size={20} />
                  <span>{documents.length} документов</span>
                </div>
                <div className="stat-item">
                  <CheckCircle size={20} />
                  <span>{documents.filter(d => ['analyzed','uploaded'].includes(d.status)).length} проанализировано</span>
                </div>
                <div className="stat-item">
                  <Clock size={20} />
                  <span>{documents.filter(d => ['processing','pending'].includes(d.status)).length} в обработке</span>
                </div>
              </div>
          </div>
          
          <div className="documents-header__actions">
            <button
              className="documents-header__btn documents-header__btn--primary"
              onClick={() => navigate('/chat')}
            >
              <MessageCircle size={20} />
              Чат
            </button>
            <button
              className="documents-header__btn documents-header__btn--primary"
              onClick={() => navigate('/lawyer')}
            >
              <Phone size={20} />
              Звонок
            </button>
            <button
              className="documents-header__btn documents-header__btn--secondary"
              onClick={() => setShowUpload(true)}
            >
              <Upload size={20} />
              Загрузить документ
            </button>
            <button 
              className="documents-header__btn documents-header__btn--secondary"
              onClick={() => navigate('/fill-documents')}
            >
              <Camera size={20} />
              Заполнение документов
            </button>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="documents-tabs">
        <div className="documents-tabs__container">
          <button 
            className={`documents-tabs__tab ${activeTab === 'documents' ? 'documents-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={20} />
            Мои документы
          </button>
          <button 
            className={`documents-tabs__tab ${activeTab === 'upload' ? 'documents-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Scan size={20} />
            Сканировать документы
          </button>
        </div>
      </section>

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <>
          {/* Search and Filters Section */}
          <section className="documents-controls">
            <div className="documents-controls__search">
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
            
            <div className="documents-controls__filters">
              <div className="filter-group">
                <Filter size={16} />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Все типы</option>
                  <option value="passport">Паспорт РФ</option>
                  <option value="snils">СНИЛС</option>
                  <option value="license">Водительские права</option>
                  <option value="birth">Свидетельство о рождении</option>
                  <option value="pdf">PDF документы</option>
                  <option value="contract">Договоры</option>
                  <option value="legal">Юридические документы</option>
                </select>
              </div>
              
              <div className="filter-group">
                <CheckCircle size={16} />
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Все статусы</option>
                  <option value="analyzed">Проанализированы</option>
                  <option value="uploaded">Загружены</option>
                  <option value="processing">В обработке</option>
                  <option value="pending">Ожидают</option>
                  <option value="error">Ошибки</option>
                </select>
              </div>
              
              <div className="filter-group">
                <Calendar size={16} />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="date">По дате (новые)</option>
                  <option value="date-old">По дате (старые)</option>
                  <option value="name">По названию (А-Я)</option>
                  <option value="name-desc">По названию (Я-А)</option>
                  <option value="size">По размеру (маленькие)</option>
                  <option value="size-desc">По размеру (большие)</option>
                  <option value="status">По статусу</option>
                </select>
              </div>
              
              <button 
                className="filter-reset-btn"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterStatus('all');
                  setSortBy('date');
                }}
                title="Сбросить все фильтры"
              >
                <X size={16} />
                Сбросить
              </button>
            </div>
          </section>

          {/* Results Counter */}
          <div className="documents-results">
            <span className="results-count">
              Найдено документов: {filteredDocuments.length} из {documents.length}
            </span>
            {(searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
              <span className="results-filtered">
                (применены фильтры)
              </span>
            )}
          </div>

          {/* Documents Grid Section */}
          <section className="documents-content">
            {filteredDocuments.length === 0 ? (
              <div className="documents-empty">
                <div className="documents-empty__icon">
                  <FileText size={64} />
                </div>
                <h3 className="documents-empty__title">Документы не найдены</h3>
                <p className="documents-empty__description">
                  {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'Загрузите свой первый документ для анализа'}
                </p>
                {!searchTerm && (
                  <button 
                    className="documents-empty__btn"
                    onClick={() => setShowUpload(true)}
                  >
                    <Plus size={20} />
                    Загрузить документ
                  </button>
                )}
              </div>
            ) : (
              <div className="documents-grid">
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
                        {toDisplayText(doc.content).substring(0, 80)}...
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
                      
                      {['processing','pending'].includes(doc.status) && (
                        <div className="document-card__progress">
                          <div className="document-card__progress-bar">
                            <div className="document-card__progress-fill" style={{ width: `${Math.round(doc.progress || 10)}%` }} />
                          </div>
                          <div className="document-card__progress-label">{Math.round(doc.progress || 10)}%</div>
                        </div>
                      )}

                      {doc.analysis && (
                        <div className="document-card__analysis">
                          <div className="analysis-item">
                            <span className="analysis-label">Риски:</span>
                            <span className="analysis-value">{doc.analysis.risksCount ?? (doc.analysis.risks?.length || 0)}</span>
                          </div>
                          <div className="analysis-item">
                            <span className="analysis-label">Рекомендации:</span>
                            <span className="analysis-value">{doc.analysis.recommendationsCount ?? (doc.analysis.recommendations?.length || 0)}</span>
                          </div>
                          <div className="analysis-item">
                            <span className="analysis-label">Соответствие:</span>
                            <span 
                              className="analysis-value"
                              style={{ color: getComplianceColor(doc.analysis.compliance) }}
                            >
                              {doc.analysis.compliance === 'high' ? 'Высокое' : 
                               doc.analysis.compliance === 'medium' ? 'Среднее' : 'Низкое'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!['processing','pending'].includes(doc.status) && (
                      <div className="document-card__actions">
                        <button 
                          className="document-card__btn document-card__btn--view"
                          onClick={() => handleDocumentClick(doc)}
                          title="Просмотреть"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        
                        <button 
                          className="document-card__btn document-card__btn--download"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Скачать"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7,10 12,15 17,10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                        </button>
                        
                        <button 
                          className="document-card__btn document-card__btn--share"
                          title="Поделиться"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                          </svg>
                        </button>
                        
                        <button
                          className="document-card__btn document-card__btn--delete"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Удалить"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" x2="10" y1="11" y2="17"></line>
                            <line x1="14" x2="14" y1="11" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Upload Tab Content */}
      {activeTab === 'upload' && (
        <section className="documents-upload">
          <div className="documents-upload__content">
            <div className="upload-section">
              <div className="upload-area">
                <Upload size={48} />
                <h3>Загрузите документ для анализа</h3>
                <p>Поддерживаются форматы: PDF, DOC, DOCX, JPG, PNG</p>
                <button 
                  className="upload-btn"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload size={20} />
                  Выбрать файл
                </button>
              </div>
            </div>

        {ocrResults.length > 0 && (
              <div className="ocr-results">
                <h3>Результаты распознавания</h3>
                <div className="ocr-results__grid">
              {ocrResults.map((res, idx) => (
                    <div key={idx} className="ocr-result-card">
                      <div className="ocr-result-card__header">
                        <FileText size={20} />
                        <h4>{res.filename}</h4>
                      </div>
                      <div className="ocr-result-card__content">
                        <pre>{res.text}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Document Types Modal */}
      {showDocumentTypes && (
        <div className="document-types-modal">
          <div className="document-types-overlay" onClick={() => setShowDocumentTypes(false)}></div>
          <div className="document-types-content">
            <div className="document-types-header">
              <h2>Выберите тип документа</h2>
              <button className="close-button" onClick={() => setShowDocumentTypes(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="document-types-grid">
              {documentTypes.map((docType) => (
                <button
                  key={docType.id}
                  className="document-type-card"
                  onClick={() => handleDocumentTypeSelect(docType)}
                >
                  <div className="document-type-icon">{docType.icon}</div>
                  <div className="document-type-info">
                    <h3 className="document-type-title">{docType.name}</h3>
                    <p className="document-type-description">{docType.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showUpload && (
        <DocumentUpload
          onTextExtracted={handleTextExtracted}
          onClose={handleCloseUpload}
          documentType={uploadDocumentType}
          storageKey="documents"
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
                  {toDisplayText(selectedDocument.content)}
                </div>
              </div>
              
              {selectedDocument.analysis && (
                <div className="document-modal__analysis">
                  <h4>Результаты анализа:</h4>
                  <div className="analysis-grid">
                    <div className="analysis-card">
                      <div className="analysis-card__header">
                        <AlertCircle size={20} />
                        <span>Риски</span>
                      </div>
                      <div className="analysis-card__value">{selectedDocument.analysis.risksCount ?? (selectedDocument.analysis.risks?.length || 0)}</div>
                    </div>
                    <div className="analysis-card">
                      <div className="analysis-card__header">
                        <CheckCircle size={20} />
                        <span>Рекомендации</span>
                      </div>
                      <div className="analysis-card__value">{selectedDocument.analysis.recommendationsCount ?? (selectedDocument.analysis.recommendations?.length || 0)}</div>
                    </div>
                    <div className="analysis-card">
                      <div className="analysis-card__header">
                        <Star size={20} />
                        <span>Соответствие</span>
                      </div>
                      <div 
                        className="analysis-card__value"
                        style={{ color: getComplianceColor(selectedDocument.analysis.compliance) }}
                      >
                        {selectedDocument.analysis.compliance === 'high' ? 'Высокое' : 
                         selectedDocument.analysis.compliance === 'medium' ? 'Среднее' : 'Низкое'}
                      </div>
                    </div>
                  </div>

                  {(selectedDocument.analysis.risks?.length || 0) > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ marginBottom: 8 }}>Детальные риски</h4>
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {selectedDocument.analysis.risks.map((r, i) => (
                          <li key={i} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertCircle size={16} />
                            <span>
                              {typeof r === 'string' ? r :
                               typeof r === 'object' && r.category ? `${r.category}: ${r.description}` :
                               typeof r === 'object' && r.description ? r.description :
                               JSON.stringify(r)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(selectedDocument.analysis.recommendations?.length || 0) > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ marginBottom: 8 }}>Рекомендации</h4>
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {selectedDocument.analysis.recommendations.map((r, i) => (
                          <li key={i} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle size={16} />
                            <span>
                              {typeof r === 'string' ? r :
                               typeof r === 'object' && r.category ? `${r.category}: ${r.description}` :
                               typeof r === 'object' && r.description ? r.description :
                               JSON.stringify(r)}
                            </span>
                          </li>
                        ))}
                      </ul>
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
                <Download size={16} />
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

export default Documents; 