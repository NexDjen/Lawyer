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