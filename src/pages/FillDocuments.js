import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Download, Edit3, Save, RotateCcw, ArrowLeft } from 'lucide-react';
import './FillDocuments.css';

const FillDocuments = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filledDocument, setFilledDocument] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState({});

  // Шаблоны документов для заполнения
  const documentTemplates = [
    {
      id: 'contract',
      name: 'Договор купли-продажи',
      description: 'Стандартный договор купли-продажи недвижимости',
      icon: '📄',
      fields: ['seller', 'buyer', 'property', 'price', 'date', 'conditions']
    },
    {
      id: 'employment',
      name: 'Трудовой договор',
      description: 'Типовой трудовой договор с работником',
      icon: '👔',
      fields: ['employer', 'employee', 'position', 'salary', 'startDate', 'conditions']
    },
    {
      id: 'rental',
      name: 'Договор аренды',
      description: 'Договор аренды жилого помещения',
      icon: '🏠',
      fields: ['landlord', 'tenant', 'property', 'rent', 'period', 'conditions']
    },
    {
      id: 'power_of_attorney',
      name: 'Доверенность',
      description: 'Генеральная доверенность на представление интересов',
      icon: '📋',
      fields: ['principal', 'agent', 'powers', 'period', 'notary', 'date']
    },
    {
      id: 'complaint',
      name: 'Жалоба',
      description: 'Жалоба в государственные органы',
      icon: '📝',
      fields: ['applicant', 'respondent', 'issue', 'request', 'date', 'evidence']
    },
    {
      id: 'statement',
      name: 'Заявление',
      description: 'Заявление в суд или государственные органы',
      icon: '📄',
      fields: ['applicant', 'recipient', 'subject', 'request', 'date', 'attachments']
    }
  ];

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setEditedFields({});
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      // Здесь будет логика обработки файла с помощью ИИ
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        // Симуляция заполненного документа
        const mockFilledDocument = {
          template: selectedTemplate,
          content: `Заполненный документ на основе шаблона "${selectedTemplate.name}"`,
          fields: {
            seller: 'Иванов Иван Иванович',
            buyer: 'Петров Петр Петрович',
            property: 'Квартира по адресу: г. Москва, ул. Примерная, д. 1, кв. 1',
            price: '5 000 000 рублей',
            date: new Date().toLocaleDateString(),
            conditions: 'Стандартные условия договора'
          }
        };
        setFilledDocument(mockFilledDocument);
      }, 2000);
    }
  };

  const handleFieldEdit = (fieldName, value) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSaveDocument = () => {
    // Логика сохранения документа
    console.log('Сохранение документа:', filledDocument);
    setIsEditing(false);
  };

  const handleDownloadDocument = () => {
    // Логика скачивания документа
    const blob = new Blob([filledDocument.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
    a.download = `${selectedTemplate.name}_заполненный.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fill-documents-page">
      <div className="fill-documents-header">
        <button 
          className="back-button"
          onClick={() => navigate('/documents')}
        >
          <ArrowLeft size={20} />
          Назад к документам
        </button>
        <h1>Заполнение документов</h1>
        <p>Автоматическое заполнение документов с помощью ИИ</p>
      </div>

      <div className="fill-documents-content">
        {!selectedTemplate ? (
          <div className="templates-section">
            <h2>Выберите шаблон документа</h2>
            <div className="templates-grid">
              {documentTemplates.map((template) => (
                <div
                  key={template.id}
                  className="template-card"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="template-icon">
                    <span>{template.icon}</span>
                  </div>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <div className="template-fields">
                    <span>Поля: {template.fields.length}</span>
          </div>
        </div>
              ))}
        </div>
          </div>
        ) : !filledDocument ? (
          <div className="upload-section">
            <div className="selected-template">
              <h2>Выбранный шаблон: {selectedTemplate.name}</h2>
              <p>{selectedTemplate.description}</p>
              <button 
                className="change-template-btn"
                onClick={() => setSelectedTemplate(null)}
              >
                Изменить шаблон
              </button>
            </div>

            <div className="upload-area">
              <div className="upload-zone">
                <Upload size={48} />
                <h3>Загрузите документ для заполнения</h3>
                <p>Поддерживаются форматы: PDF, DOC, DOCX, TXT</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                <button className="upload-btn">Выбрать файл</button>
              </div>
        </div>

            {isProcessing && (
              <div className="processing">
                <div className="spinner"></div>
                <p>Обработка документа с помощью ИИ...</p>
          </div>
        )}
      </div>
        ) : (
          <div className="result-section">
            <div className="result-header">
              <h2>Заполненный документ</h2>
              <div className="result-actions">
                <button 
                  className="edit-btn"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 size={16} />
                  {isEditing ? 'Завершить редактирование' : 'Редактировать'}
                </button>
                <button 
                  className="download-btn"
                  onClick={handleDownloadDocument}
                >
                  <Download size={16} />
                  Скачать
                </button>
                <button 
                  className="new-btn"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setFilledDocument(null);
                    setEditedFields({});
                  }}
                >
                  Новый документ
                </button>
        </div>
        </div>

            <div className="document-preview">
              <div className="document-content">
                <h3>Предварительный просмотр:</h3>
                <div className="content-text">
                  {filledDocument.content}
        </div>
      </div>

              {isEditing && (
                <div className="fields-editor">
                  <h3>Редактирование полей:</h3>
                  {Object.entries(filledDocument.fields).map(([field, value]) => (
                    <div key={field} className="field-editor">
                      <label>{field}:</label>
                      <input
                        type="text"
                        value={editedFields[field] || value}
                        onChange={(e) => handleFieldEdit(field, e.target.value)}
                      />
                    </div>
                  ))}
                  <button 
                    className="save-btn"
                    onClick={handleSaveDocument}
                  >
                    <Save size={16} />
                    Сохранить изменения
          </button>
                </div>
              )}
            </div>
      </div>
        )}
      </div>
    </div>
  );
};

export default FillDocuments;