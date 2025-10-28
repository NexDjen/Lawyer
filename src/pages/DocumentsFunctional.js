import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  CheckCircle,
  Upload,
  Plus,
  X,
  Package
} from 'lucide-react';
import DocumentUpload from '../components/DocumentUpload';
import { downloadText } from '../utils/downloadUtils';
import './Documents.css';

const DocumentsFunctional = () => {
  const location = useLocation();
  
  // Логирование для диагностики
  console.log('DocumentsFunctional component rendered, current location:', location.pathname);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: 'Договор аренды',
      type: 'contract',
      status: 'analyzed',
      uploadedAt: '2024-01-15',
      size: '2.5 MB',
      content: 'Договор аренды недвижимости между сторонами...'
    },
    {
      id: 2,
      name: 'Паспорт РФ',
      type: 'passport',
      status: 'uploaded',
      uploadedAt: '2024-01-14',
      size: '1.2 MB',
      content: 'Паспорт гражданина Российской Федерации...'
    },
    {
      id: 3,
      name: 'СНИЛС',
      type: 'snils',
      status: 'processing',
      uploadedAt: '2024-01-13',
      size: '0.8 MB',
      content: 'Страховой номер индивидуального лицевого счета...'
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = searchTerm === '' || 
                           doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || doc.type === filterType;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'analyzed': return '#10b981';
      case 'uploaded': return '#3b82f6';
      case 'processing': return '#f59e0b';
      case 'pending': return '#6b7280';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'analyzed': return 'Проанализирован';
      case 'uploaded': return 'Загружен';
      case 'processing': return 'В обработке';
      case 'pending': return 'Ожидает';
      case 'error': return 'Ошибка';
      default: return 'Неизвестно';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'batch': return 'Пакет документов';
      case 'contract': return 'Договор';
      case 'passport': return 'Паспорт РФ';
      case 'snils': return 'СНИЛС';
      case 'license': return 'Водительские права';
      case 'birth': return 'Свидетельство о рождении';
      case 'pdf': return 'PDF документ';
      default: return 'Документ';
    }
  };

  return (
    <div className="documents-page">
      <div className="container">
        {/* Header */}
        <div className="documents-header">
          <h1 style={{color: 'white'}}>Управление документами</h1>
          <p style={{color: 'white'}}>Просмотр и управление всеми документами системы</p>
        </div>

        {/* Search and Filters */}
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

        {/* Upload Button */}
        <div className="documents-upload" style={{ marginBottom: '20px' }}>
          <button 
            className="btn btn--primary btn--large"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={20} />
            Загрузить новый документ
          </button>
        </div>

        {/* Documents Grid */}
        <section className="documents-content">
          {filteredDocuments.length === 0 ? (
            <div className="documents-empty">
              <div className="documents-empty__icon">
                <FileText size={64} />
              </div>
              <h3 className="documents-empty__title">Документы не найдены</h3>
              <p className="documents-empty__description">
                Попробуйте изменить параметры поиска или загрузите новые документы
              </p>
              <button className="btn btn--primary">
                <Upload size={20} />
                Загрузить документ
              </button>
            </div>
          ) : (
            <div className="documents-grid">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="document-card__header">
                    <div className="document-card__icon">
                      {doc.type === 'batch' ? <Package size={24} /> : <FileText size={24} />}
                    </div>
                    <div className="document-card__status">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(doc.status) }}
                      >
                        {getStatusText(doc.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="document-card__content">
                    <h3 className="document-card__title">{doc.name}</h3>
                    <p className="document-card__type">{getTypeText(doc.type)}</p>
                    <p className="document-card__description">
                      {doc.content.substring(0, 100)}...
                    </p>
                    <div className="document-card__meta">
                      <span className="document-card__date">
                        {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}
                      </span>
                      <span className="document-card__size">{doc.size}</span>
                    </div>
                  </div>
                  
                  <div className="document-card__actions">
                    <button 
                      className="btn btn--icon"
                      onClick={() => {
                        console.log('Просмотр документа:', doc);
                        alert(`Просмотр документа: ${doc.name}\n\nСодержимое:\n${doc.content.substring(0, 500)}...`);
                      }}
                      title="Просмотр"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button 
                      className="btn btn--icon"
                      onClick={() => {
                        console.log('Скачивание документа:', doc);
                        downloadText(doc.content, doc.name);
                      }}
                      title="Скачать"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </button>
                    <button 
                      className="btn btn--icon btn--danger"
                      onClick={() => {
                        if (window.confirm(`Удалить документ "${doc.name}"?`)) {
                          setDocuments(prev => prev.filter(d => d.id !== doc.id));
                        }
                      }}
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
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUpload
          onTextExtracted={(text, filename) => {
            // Add new document to the list
            const newDocument = {
              id: Date.now(),
              name: filename,
              type: 'document',
              status: 'analyzed',
              uploadedAt: new Date().toISOString().split('T')[0],
              size: `${(text.length / 1024).toFixed(1)} KB`,
              content: text
            };
            setDocuments(prev => [newDocument, ...prev]);
            setShowUploadModal(false);
          }}
          onClose={() => setShowUploadModal(false)}
          storageKey="documents"
        />
      )}
    </div>
  );
};

export default DocumentsFunctional;
