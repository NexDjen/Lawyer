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

      console.log('Загружаем файл:', file.name, 'размер:', file.size);
      
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Ошибка загрузки файла:', uploadResponse.status, errorText);
        throw new Error(`Ошибка загрузки файла: ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        content: uploadData.recognizedText || 'Текст не распознан'
      });

      // Начинаем анализ
      setIsAnalyzing(true);
      
      console.log('Начинаем анализ документа:', file.name);
      console.log('Текст для анализа:', uploadData.recognizedText?.substring(0, 100) + '...');
      
      const analysisResponse = await fetch('/api/documents/advanced-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: uploadData.recognizedText || '',
          documentName: file.name,
          userId: 'current-user'
        }),
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('Ошибка анализа документа:', analysisResponse.status, errorText);
        throw new Error(`Ошибка анализа документа: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      console.log('Анализ завершен:', analysisData);
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
                <span className={`level-value level-${analysisResult.data?.analysis?.summary?.riskLevel || 'medium'}`}>
                  {analysisResult.data?.analysis?.summary?.riskLevel === 'high' ? 'Высокий' : 
                   analysisResult.data?.analysis?.summary?.riskLevel === 'low' ? 'Низкий' : 'Средний'}
                </span>
              </div>
              <ul className="risk-list">
                {analysisResult.data?.analysis?.risks?.map((risk, index) => (
                  <li key={index}>
                    <strong>{risk.category}:</strong> {risk.description}
                    <br />
                    <small>Вероятность: {risk.probability}, Влияние: {risk.impact}</small>
                  </li>
                ))}
              </ul>
            </div>

            <div className="analysis-card recommendations">
              <h5>💡 Рекомендации</h5>
              <ul className="recommendation-list">
                {analysisResult.data?.analysis?.recommendations?.map((rec, index) => (
                  <li key={index}>
                    <strong>{rec.category}:</strong> {rec.description}
                    <br />
                    <small>Приоритет: {rec.priority}, Реализация: {rec.implementation}</small>
                  </li>
                ))}
              </ul>
            </div>

            <div className="analysis-card compliance">
              <h5>⚖️ Соответствие</h5>
              <div className="compliance-status">
                <span className="status-label">Статус:</span>
                <span className={`status-value status-${analysisResult.data?.analysis?.summary?.overallQuality || 'medium'}`}>
                  {analysisResult.data?.analysis?.summary?.overallQuality === 'good' ? 'Хорошее' : 
                   analysisResult.data?.analysis?.summary?.overallQuality === 'poor' ? 'Плохое' : 'Среднее'}
                </span>
              </div>
              <p className="compliance-note">
                {analysisResult.data?.analysis?.complianceIssues?.length > 0 
                  ? `Найдено ${analysisResult.data.analysis.complianceIssues.length} нарушений соответствия`
                  : 'Документ соответствует требованиям'}
              </p>
            </div>

            <div className="analysis-card summary">
              <h5>📋 Краткое резюме</h5>
              <p className="summary-text">
                <strong>Тип документа:</strong> {analysisResult.data?.analysis?.summary?.documentType}<br />
                <strong>Основные проблемы:</strong> {analysisResult.data?.analysis?.summary?.mainIssues?.join(', ')}<br />
                <strong>Всего найдено проблем:</strong> {analysisResult.data?.analysis?.statistics?.totalIssues}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadWithAnalysis;
