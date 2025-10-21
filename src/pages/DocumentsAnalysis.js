import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Upload, FileText, AlertCircle, CheckCircle, File, Calendar } from 'lucide-react';
import DocumentUpload from '../components/DocumentUpload';
import DocumentDetailView from '../components/DocumentDetailView';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';
import './DocumentsAnalysis.css';

const DocumentsAnalysis = () => {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedDocument, setSelectedDocument] = useState(null);

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
          const convertedDocuments = result.data.map(doc => {
            // First prioritize detailed analysis from database
            let analysisResult = doc.analysis;
            
            // If not available, try to parse analysis_result or analysisResult
            if (!analysisResult) {
              analysisResult = doc.analysis_result || doc.analysisResult;
              if (typeof analysisResult === 'string') {
                try {
                  analysisResult = JSON.parse(analysisResult);
                } catch (e) {
                  console.warn('Failed to parse analysis_result:', e);
                  analysisResult = null;
                }
              }
            }
            
            return {
              id: doc.id,
              name: doc.filename || doc.original_name || 'Документ',
              content: doc.extracted_text || '',
              uploadedAt: doc.created_at,
              type: doc.document_type || 'unknown',
              status: 'analyzed',
              size: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
              analysis: analysisResult
            };
          });
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
    loadDocuments();
  }, [loadDocuments]);

  const handleTextExtracted = (text, filename) => {
    console.log('Документ обработан:', filename);
    setShowUpload(false);
    loadDocuments(); // Reload documents after saving
  };

  const handleCloseUpload = () => {
    setShowUpload(false);
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }
    
    try {
      const response = await fetch(buildApiUrl(`documents/${documentId}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        console.log('✅ Документ успешно удален из API');
        // Clear localStorage to force fresh load from API
        localStorage.removeItem('documents');
        // Reload documents from API only
        await loadDocuments();
        return;
      }
    } catch (error) {
      console.warn('Failed to delete document from API, falling back to localStorage:', error);
    }
    // Fallback to localStorage
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    setDocuments(updatedDocuments);
    localStorage.setItem('documents', JSON.stringify(updatedDocuments));
    console.log('✅ Документ удален из localStorage');
  };

  // Функция для загрузки полного анализа документа с сервера
  const loadFullDocumentAnalysis = async (documentId, document) => {
    try {
      const response = await fetch(buildApiUrl(`documents/${documentId}`));
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const doc = result.data;
          
          // First prioritize detailed analysis from database
          let analysisResult = doc.analysis;
          
          // If not available, try to parse analysis_result or analysisResult
          if (!analysisResult) {
            analysisResult = doc.analysis_result || doc.analysisResult;
            if (typeof analysisResult === 'string') {
              try {
                analysisResult = JSON.parse(analysisResult);
              } catch (e) {
                console.warn('Failed to parse analysis_result:', e);
                analysisResult = null;
              }
            }
          }
          
          // Merge with existing document data
          return {
            ...document,
            id: doc.id,
            name: doc.filename || doc.original_name || document.name,
            content: doc.extracted_text || document.content,
            uploadedAt: doc.created_at,
            type: doc.document_type || 'unknown',
            status: 'analyzed',
            size: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '0 KB',
            analysis: analysisResult,
            extracted_text: doc.extracted_text
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load full document analysis:', error);
    }
    
    // Return original document if fetch fails
    return document;
  };

  const handleViewDocument = async (document) => {
    // Load full analysis from server
    const fullDocument = await loadFullDocumentAnalysis(document.id, document);
    setSelectedDocument(fullDocument);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDocument(null);
  };



  // Helper functions
  const getTypeIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText size={24} />;
      case 'image': return <FileText size={24} />;
      default: return <FileText size={24} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'analyzed': return <CheckCircle size={16} />;
      case 'processing': return <AlertCircle size={16} />;
      case 'error': return <AlertCircle size={16} />;
      default: return <File size={16} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'analyzed': return 'Проанализирован';
      case 'processing': return 'Обрабатывается';
      case 'error': return 'Ошибка';
      default: return 'Загружен';
    }
  };

  const toDisplayText = (content) => {
    if (typeof content === 'string') {
      return content;
    }
    if (typeof content === 'object') {
      return JSON.stringify(content);
    }
    return String(content);
  };

  // Generate brief description (2-3 words) based on document type and content
  const generateDescription = (doc) => {
    // Descriptions by document type
    const typeDescriptions = {
      'pdf': 'PDF документ',
      'image': 'Изображение документа',
      'legal': 'Правовой документ',
      'contract': 'Договор/соглашение',
      'passport': 'Паспорт',
      'snils': 'СНИЛС документ',
      'inn': 'ИНН свидетельство',
      'driver_license': 'Водительское удостоверение',
      'power_of_attorney': 'Доверенность',
      'court_document': 'Судебный документ',
      'complaint': 'Жалоба/претензия',
      'statement': 'Исковое заявление',
      'resolution': 'Постановление суда',
      'agreement': 'Соглашение сторон'
    };
    
    const typeDesc = typeDescriptions[doc.type] || 'Загруженный документ';
    
    // Extract key words from content if available
    if (doc.content) {
      const text = toDisplayText(doc.content).toLowerCase();
      
      // Keywords to identify document purpose
      const keywords = [
        { word: 'договор', desc: 'Договор' },
        { word: 'исковое', desc: 'Исковое заявление' },
        { word: 'жалоба', desc: 'Жалоба/претензия' },
        { word: 'постановление', desc: 'Постановление' },
        { word: 'определение', desc: 'Определение суда' },
        { word: 'решение', desc: 'Решение суда' },
        { word: 'апелляция', desc: 'Апелляционная жалоба' },
        { word: 'кассация', desc: 'Кассационная жалоба' },
        { word: 'уголовное', desc: 'Уголовное дело' },
        { word: 'гражданское', desc: 'Гражданское дело' }
      ];
      
      for (const kw of keywords) {
        if (text.includes(kw.word)) {
          return kw.desc;
        }
      }
    }
    
    return typeDesc;
  };

  return (
    <div className="documents-analysis-page">
      <div className="container">
        <div className="documents-analysis-content">
          <div className="analysis-header">
            <div className="analysis-header__icon">
              <Brain size={48} />
            </div>
            <div className="analysis-header__text">
              <h1 className="analysis-title">Анализ документов</h1>
              <p className="analysis-subtitle">
                Глубокий анализ документов с помощью ИИ. Загрузите документ и получите детальный отчет о рисках, ошибках и рекомендациях.
              </p>
            </div>
          </div>

          {/* Компонент загрузки и анализа документов */}
          <div className="document-upload-section">
            <div className="upload-section">
              <h3 className="upload-title">Загрузите документ для анализа</h3>
              <p className="upload-description">
                Загрузите PDF, Word, изображение или текстовый файл для глубокого анализа с помощью ИИ
              </p>
              
              <div className="upload-area">
                <button 
                  className="upload-button"
                  onClick={() => setShowUpload(true)}
                  title="Нажмите для выбора файла"
                >
                  <Upload size={24} />
                  <span>Выберите файл</span>
                </button>
              </div>
              
            </div>
          </div>

          {/* Список загруженных документов */}
          <div className="documents-list-section">
            <div className="documents-list-header">
              <h3 className="documents-list-title">Загруженные документы</h3>
              <p className="documents-list-description">
                Просматривайте и управляйте вашими проанализированными документами
              </p>
            </div>

            {documents.length === 0 ? (
              <div className="documents-empty">
                <h4 className="documents-empty__title">Нет загруженных документов</h4>
              </div>
            ) : (
              <div className="documents-grid">
                {documents.map((doc, index) => (
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
                        {generateDescription(doc)}
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
                        className="document-card__btn document-card__btn--primary"
                        onClick={() => handleViewDocument(doc)}
                        title="Просмотреть документ"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      <button 
                        className="document-card__btn document-card__btn--secondary"
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Удалить документ"
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
          </div>

        </div>
      </div>

      {/* Document Upload Modal */}
      {showUpload && (
        <DocumentUpload
          onTextExtracted={handleTextExtracted}
          onClose={handleCloseUpload}
          storageKey="documents"
        />
      )}

      {/* Document Detail View */}
      {viewMode === 'detail' && selectedDocument && (
        <DocumentDetailView 
          document={selectedDocument}
          onBack={handleBackToList}
        />
      )}

    </div>
  );
};

export default DocumentsAnalysis;
