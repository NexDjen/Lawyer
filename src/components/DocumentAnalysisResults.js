import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, FileText, Shield, Lightbulb, AlertCircle } from 'lucide-react';
import './DocumentAnalysisResults.css';

const DocumentAnalysisResults = ({ analysis, fileName, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!analysis) {
    return (
      <div className="analysis-results">
        <div className="analysis-results__error">
          <XCircle size={24} />
          <p>Ошибка при анализе документа</p>
        </div>
      </div>
    );
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle size={16} className="icon-critical" />;
      case 'high': return <AlertTriangle size={16} className="icon-high" />;
      case 'medium': return <AlertCircle size={16} className="icon-medium" />;
      case 'low': return <Info size={16} className="icon-low" />;
      default: return <Info size={16} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle size={16} className="icon-high" />;
      case 'medium': return <AlertCircle size={16} className="icon-medium" />;
      case 'low': return <Info size={16} className="icon-low" />;
      default: return <Info size={16} />;
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return '#16a34a';
      case 'good': return '#22c55e';
      case 'average': return '#d97706';
      case 'poor': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getQualityText = (quality) => {
    switch (quality) {
      case 'excellent': return 'Отличное';
      case 'good': return 'Хорошее';
      case 'average': return 'Среднее';
      case 'poor': return 'Плохое';
      default: return 'Неизвестно';
    }
  };

  const getRiskLevelText = (level) => {
    switch (level) {
      case 'critical': return 'Критический';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Неизвестно';
    }
  };

  return (
    <div className="analysis-results">
      <div className="analysis-results__header">
        <div className="analysis-results__title">
          <FileText size={24} />
          <h2>Результаты анализа документа</h2>
        </div>
        <button className="btn btn--secondary" onClick={onClose}>
          Закрыть
        </button>
      </div>

      <div className="analysis-results__filename">
        <strong>Файл:</strong> {fileName}
      </div>

      {/* Навигация по вкладкам */}
      <div className="analysis-results__tabs">
        <button 
          className={`tab ${activeTab === 'summary' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <Info size={16} />
          Обзор
        </button>
        <button 
          className={`tab ${activeTab === 'errors' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          <XCircle size={16} />
          Ошибки ({analysis.legalErrors?.length || 0})
        </button>
        <button 
          className={`tab ${activeTab === 'risks' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('risks')}
        >
          <AlertTriangle size={16} />
          Риски ({analysis.risks?.length || 0})
        </button>
        <button 
          className={`tab ${activeTab === 'recommendations' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <Lightbulb size={16} />
          Рекомендации ({analysis.recommendations?.length || 0})
        </button>
        <button 
          className={`tab ${activeTab === 'compliance' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          <Shield size={16} />
          Соответствие ({analysis.complianceIssues?.length || 0})
        </button>
      </div>

      {/* Содержимое вкладок */}
      <div className="analysis-results__content">
        {activeTab === 'summary' && (
          <div className="summary-tab">
            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-card__icon">
                  <FileText size={24} />
                </div>
                <div className="stat-card__content">
                  <h3>Тип документа</h3>
                  <p>{analysis.summary?.documentType || 'Неизвестно'}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-card__icon">
                  <CheckCircle size={24} style={{ color: getQualityColor(analysis.summary?.overallQuality) }} />
                </div>
                <div className="stat-card__content">
                  <h3>Качество документа</h3>
                  <p style={{ color: getQualityColor(analysis.summary?.overallQuality) }}>
                    {getQualityText(analysis.summary?.overallQuality)}
                  </p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-card__icon">
                  <AlertTriangle size={24} style={{ color: getRiskLevelColor(analysis.summary?.riskLevel) }} />
                </div>
                <div className="stat-card__content">
                  <h3>Уровень риска</h3>
                  <p style={{ color: getRiskLevelColor(analysis.summary?.riskLevel) }}>
                    {getRiskLevelText(analysis.summary?.riskLevel)}
                  </p>
                </div>
              </div>
            </div>

            {analysis.summary?.mainIssues && analysis.summary.mainIssues.length > 0 && (
              <div className="main-issues">
                <h3>Основные проблемы:</h3>
                <ul>
                  {analysis.summary.mainIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.statistics && (
              <div className="statistics">
                <h3>Статистика анализа:</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Всего проблем:</span>
                    <span className="stat-value">{analysis.statistics.totalIssues}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Критических ошибок:</span>
                    <span className="stat-value critical">{analysis.statistics.criticalIssues}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Приоритетных рекомендаций:</span>
                    <span className="stat-value">{analysis.statistics.highPriorityRecommendations}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Отсутствующих элементов:</span>
                    <span className="stat-value">{analysis.statistics.missingElementsCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="errors-tab">
            {analysis.legalErrors && analysis.legalErrors.length > 0 ? (
              <div className="errors-list">
                {analysis.legalErrors.map((error, index) => (
                  <div key={index} className="error-item">
                    <div className="error-header">
                      {getSeverityIcon(error.severity)}
                      <h4>{error.type}</h4>
                      <span 
                        className="severity-badge"
                        style={{ backgroundColor: getSeverityColor(error.severity) }}
                      >
                        {error.severity}
                      </span>
                    </div>
                    <div className="error-content">
                      <p><strong>Описание:</strong> {error.description}</p>
                      {error.location && <p><strong>Местоположение:</strong> {error.location}</p>}
                      <p><strong>Решение:</strong> {error.solution}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CheckCircle size={48} className="icon-success" />
                <p>Юридических ошибок не найдено</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="risks-tab">
            {analysis.risks && analysis.risks.length > 0 ? (
              <div className="risks-list">
                {analysis.risks.map((risk, index) => (
                  <div key={index} className="risk-item">
                    <div className="risk-header">
                      <AlertTriangle size={16} />
                      <h4>{risk.category}</h4>
                      <div className="risk-badges">
                        <span className="probability-badge">
                          Вероятность: {risk.probability}
                        </span>
                        <span className="impact-badge">
                          Влияние: {risk.impact}
                        </span>
                      </div>
                    </div>
                    <div className="risk-content">
                      <p><strong>Описание:</strong> {risk.description}</p>
                      <p><strong>Минимизация:</strong> {risk.mitigation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CheckCircle size={48} className="icon-success" />
                <p>Рисков не выявлено</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-tab">
            {analysis.recommendations && analysis.recommendations.length > 0 ? (
              <div className="recommendations-list">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item">
                    <div className="recommendation-header">
                      {getPriorityIcon(rec.priority)}
                      <h4>{rec.category}</h4>
                      <span 
                        className="priority-badge"
                        style={{ 
                          backgroundColor: rec.priority === 'high' ? '#dc2626' : 
                                          rec.priority === 'medium' ? '#d97706' : '#16a34a'
                        }}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <div className="recommendation-content">
                      <p><strong>Рекомендация:</strong> {rec.description}</p>
                      <p><strong>Реализация:</strong> {rec.implementation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Info size={48} />
                <p>Рекомендации отсутствуют</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="compliance-tab">
            {analysis.complianceIssues && analysis.complianceIssues.length > 0 ? (
              <div className="compliance-list">
                {analysis.complianceIssues.map((issue, index) => (
                  <div key={index} className="compliance-item">
                    <div className="compliance-header">
                      <Shield size={16} />
                      <h4>{issue.regulation}</h4>
                    </div>
                    <div className="compliance-content">
                      <p><strong>Описание нарушения:</strong> {issue.description}</p>
                      <p><strong>Последствия:</strong> {issue.consequence}</p>
                      <p><strong>Исправление:</strong> {issue.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CheckCircle size={48} className="icon-success" />
                <p>Нарушений соответствия не найдено</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalysisResults;
