import React, { useState } from 'react';
import { Upload, FileText, Image, File, X, Brain, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import './DocumentUploadWithAnalysis.css';

const DocumentUploadWithAnalysis = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Загружаем файл
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'current-user'); // В реальном приложении получить из контекста

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const uploadData = await uploadResponse.json();
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        content: uploadData.text || 'Текст не распознан'
      });

      // Начинаем анализ
      setIsAnalyzing(true);
      
      const analysisResponse = await fetch('/api/documents/advanced-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: uploadData.text || '',
          documentName: file.name,
          userId: 'current-user'
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Ошибка анализа документа');
      }

      const analysisData = await analysisResponse.json();
      setAnalysisResult(analysisData);
      
    } catch (err) {
      setError(err.message);
      console.error('Ошибка:', err);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image size={20} />;
    if (fileType.includes('pdf')) return <FileText size={20} />;
    return <File size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="document-upload-analysis">
      <div className="upload-section">
        <h3 className="upload-title">Загрузите документ для анализа</h3>
        <p className="upload-description">
          Загрузите PDF, Word, изображение или текстовый файл для глубокого анализа с помощью ИИ
        </p>
        
        <div className="upload-area">
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={isUploading || isAnalyzing}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload" className="upload-button">
            <Upload size={24} />
            <span>
              {isUploading ? 'Загружается...' : isAnalyzing ? 'Анализируется...' : 'Выберите файл'}
            </span>
          </label>
        </div>

        {uploadedFile && (
          <div className="uploaded-file">
            <div className="file-info">
              {getFileIcon(uploadedFile.type)}
              <div className="file-details">
                <span className="file-name">{uploadedFile.name}</span>
                <span className="file-size">{formatFileSize(uploadedFile.size)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="analysis-loading">
          <div className="loading-spinner">
            <Brain size={24} className="spinning" />
          </div>
          <p>ИИ анализирует документ...</p>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">
          <h4 className="results-title">
            <CheckCircle size={20} />
            Результаты анализа
          </h4>
          
          <div className="analysis-grid">
            <div className="analysis-card risks">
              <h5>🚨 Риски</h5>
              <div className="risk-level">
                <span className="level-label">Уровень риска:</span>
                <span className={`level-value level-${analysisResult.riskLevel || 'medium'}`}>
                  {analysisResult.riskLevel || 'Средний'}
                </span>
              </div>
              <ul className="risk-list">
                {analysisResult.risks?.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </div>

            <div className="analysis-card recommendations">
              <h5>💡 Рекомендации</h5>
              <ul className="recommendation-list">
                {analysisResult.recommendations?.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="analysis-card compliance">
              <h5>⚖️ Соответствие</h5>
              <div className="compliance-status">
                <span className="status-label">Статус:</span>
                <span className={`status-value status-${analysisResult.compliance || 'medium'}`}>
                  {analysisResult.compliance || 'Требует внимания'}
                </span>
              </div>
              <p className="compliance-note">
                {analysisResult.complianceNote || 'Документ требует дополнительной проверки'}
              </p>
            </div>

            <div className="analysis-card summary">
              <h5>📋 Краткое резюме</h5>
              <p className="summary-text">
                {analysisResult.summary || 'Анализ завершен. Обратите внимание на выявленные риски и рекомендации.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadWithAnalysis;
