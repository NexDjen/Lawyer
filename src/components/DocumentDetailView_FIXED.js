import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import './DocumentDetailView.css';

const DocumentDetailView = ({ document, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [initialAnalysisData, setInitialAnalysisData] = useState(null);

  console.log('🔍 DocumentDetailView received document:', document);
  console.log('🔍 document.analysis:', document.analysis);
  console.log('🔍 document.extracted_text:', document.extracted_text);

  useEffect(() => {
    if (document && document.extracted_text) {
      try {
        const parsed = JSON.parse(document.extracted_text);
        setInitialAnalysisData(parsed);
      } catch (e) {
        console.warn('Failed to parse extracted_text:', e);
      }
    }
  }, [document]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Ответ на: "${inputMessage}" - это тестовый ответ от Галины.`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toDisplayText = (content) => {
    if (typeof content === 'string') {
      return content.split('\n').map((line, index) => (
        <span key={index}>
          {line}
          {index < content.split('\n').length - 1 && <br />}
        </span>
      ));
    }
    return content;
  };

  return (
    <div className="document-detail-view">
      <div className="document-detail-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Назад к списку
        </button>
        <h2 className="document-title">{document.name}</h2>
      </div>
      
      <div className="document-detail-content">
        <div className="document-panel">
          {/* ✅ Raw document content removed - only AI analysis below */}
          
          {/* Expert Analysis Section */}
          {document.analysis && (
            <div className="llm-analysis-container">
              <div className="analysis-header-new">
                <h3>📊 Экспертный анализ от Галины</h3>
                <p className="analysis-subtitle">Профессиональное заключение по документу</p>
              </div>
              
              {/* Expert Opinion */}
              {document.analysis.expertOpinion && (
                <div className="analysis-section expert-opinion-section">
                  <div className="section-header">
                    <span className="section-icon">💼</span>
                    <h4>Экспертное мнение</h4>
                  </div>
                  <div className="section-content">
                    <p className="expert-text">{document.analysis.expertOpinion}</p>
                    {document.analysis.criticalIssues && document.analysis.criticalIssues.length > 0 && (
                      <div className="critical-section">
                        <strong>Критические моменты:</strong>
                        <ul className="critical-list">
                          {document.analysis.criticalIssues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Legal Errors */}
              {document.analysis.legalErrors && document.analysis.legalErrors.length > 0 && (
                <div className="analysis-section errors-section">
                  <div className="section-header">
                    <span className="section-icon">⚠️</span>
                    <h4>Юридические ошибки ({document.analysis.legalErrors.length})</h4>
                  </div>
                  <div className="section-content">
                    {document.analysis.legalErrors.map((error, idx) => {
                      const errorObj = typeof error === 'string' ? { type: error, severity: 'medium' } : error;
                      const severity = errorObj.severity || 'medium';
                      
                      return (
                        <div key={idx} className={`error-box severity-${severity}`}>
                          <div className="error-header-new">
                            <span className="error-type-badge">{errorObj.type || error}</span>
                            <span className={`severity-badge severity-${severity}`}>{severity}</span>
                          </div>
                          <p className="error-text">{errorObj.description || error}</p>
                          {errorObj.location && (
                            <p className="error-meta"><strong>📍 Расположение:</strong> {errorObj.location}</p>
                          )}
                          {errorObj.solution && (
                            <p className="error-meta"><strong>✅ Решение:</strong> {errorObj.solution}</p>
                          )}
                          {errorObj.basis && (
                            <p className="error-meta"><strong>📜 Основание:</strong> {errorObj.basis}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Risks */}
              {document.analysis.risks && document.analysis.risks.length > 0 && (
                <div className="analysis-section risks-section">
                  <div className="section-header">
                    <span className="section-icon">🚨</span>
                    <h4>Выявленные риски</h4>
                  </div>
                  {document.analysis.riskLevel && (
                    <div className="risk-level-bar">
                      <span>Уровень риска:</span>
                      <span className={`risk-level-badge level-${document.analysis.riskLevel}`}>
                        {document.analysis.riskLevel === 'high' ? '🔴 Высокий' : 
                         document.analysis.riskLevel === 'medium' ? '🔵 Средний' : '🟢 Низкий'}
                      </span>
                    </div>
                  )}
                  <div className="risks-grid">
                    {document.analysis.risks.map((risk, idx) => {
                      const riskObj = typeof risk === 'string' ? { title: risk, category: 'риск' } : risk;
                      
                      return (
                        <div key={idx} className="risk-card">
                          <div className="risk-title">{riskObj.title || riskObj.category || 'риск'}</div>
                          <p className="risk-text">{riskObj.description || risk}</p>
                          {riskObj.minimization && (
                            <p className="risk-meta"><strong>Как минимизировать:</strong> {riskObj.minimization}</p>
                          )}
                          {riskObj.consequences && (
                            <p className="risk-meta"><strong>Правовые последствия:</strong> {riskObj.consequences}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Recommendations */}
              {document.analysis.recommendations && document.analysis.recommendations.length > 0 && (
                <div className="analysis-section recommendations-section">
                  <div className="section-header">
                    <span className="section-icon">💡</span>
                    <h4>Рекомендации Галины</h4>
                  </div>
                  <div className="recommendation-grid">
                    {document.analysis.recommendations.map((rec, idx) => {
                      let recObj = rec;
                      if (typeof rec === 'string') {
                        recObj = { title: rec, text: rec, priority: 'normal' };
                      } else if (typeof rec !== 'object' || rec === null) {
                        recObj = { title: String(rec), text: String(rec), priority: 'normal' };
                      }
                      
                      const priority = recObj.priority === 'high' || recObj.priority === 'critical' ? 'high' : 'normal';
                      const title = recObj.title || recObj.description || rec;
                      const description = recObj.text || recObj.description || '';
                      
                      return (
                        <div key={idx} className={`rec-card priority-${priority}`}>
                          <div className="rec-header-new">
                            <span className={`priority-dot priority-${priority}`}></span>
                            <strong>{title}</strong>
                          </div>
                          {description && description !== title && (
                            <p className="rec-text">{description}</p>
                          )}
                          {recObj.implementation && (
                            <p className="rec-meta"><strong>Как реализовать:</strong> {recObj.implementation}</p>
                          )}
                          {recObj.timeline && (
                            <p className="rec-meta"><strong>Сроки:</strong> {recObj.timeline}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Next Steps */}
              {document.analysis.nextSteps && document.analysis.nextSteps.length > 0 && (
                <div className="analysis-section next-steps-section">
                  <div className="section-header">
                    <span className="section-icon">🎯</span>
                    <h4>Следующие шаги</h4>
                  </div>
                  <ol className="steps-list">
                    {document.analysis.nextSteps.map((step, idx) => {
                      const stepText = typeof step === 'string' ? step : (step.description || step.title || JSON.stringify(step));
                      return <li key={idx}>{stepText}</li>;
                    })}
                  </ol>
                </div>
              )}
              
              {/* Compliance */}
              {document.analysis.compliance && (
                <div className="analysis-section compliance-section">
                  <div className="section-header">
                    <span className="section-icon">✅</span>
                    <h4>Соответствие требованиям</h4>
                  </div>
                  <div className="compliance-content">
                    <div className="compliance-item compliance-medium">
                      <div className="compliance-header">
                        <span className="compliance-icon">⚠️</span>
                        <span className="compliance-label">ТРЕБУЕТ ПРОВЕРКИ</span>
                        <div className="compliance-rating">
                          <span className="rating-score">2/5</span>
                          <div className="rating-stars">⭐⭐☆☆☆</div>
                        </div>
                      </div>
                      <p>Необходима дополнительная проверка соответствия требованиям</p>
                      <div className="compliance-details">
                        <h5>🔍 Требуется проверка:</h5>
                        <ul>
                          <li>Проверить наличие всех обязательных реквизитов</li>
                          <li>Убедиться в соблюдении процессуальных требований</li>
                          <li>Проверить соответствие содержания правовым нормам</li>
                          <li>Подтвердить полномочия подписантов</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              
              <div className="preview-actions">
                <button className="save-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Сохранить документ
                </button>
              </div>
            </div>
          )}
          
          {/* Initial Analysis Data */}
          {initialAnalysisData && (
            <div className="initial-analysis-raw">
              <h3>🕒 Первичный анализ (при первой загрузке)</h3>
              <pre className="initial-analysis-json">{JSON.stringify(initialAnalysisData, null, 2)}</pre>
            </div>
          )}
          
          {/* Primary Analysis */}
          {document.analysis && (
            <div className="initial-analysis">
              <h3>🧠 Первичный анализ документа</h3>
              <p><strong>Краткое резюме:</strong> {Array.isArray(document.analysis.summary?.mainIssues) ? document.analysis.summary.mainIssues.join(', ') : document.analysis.summary}</p>
              <p><strong>Риски:</strong> {
                Array.isArray(document.analysis.risks)
                  ? document.analysis.risks.map(r => 
                      typeof r === 'string' 
                        ? r 
                        : (r.title || r.description || r.category || 'Неизвестный риск')
                    ).join(', ')
                  : 'Риски не выявлены'
              }</p>
              <p><strong>Рекомендации:</strong> {
                Array.isArray(document.analysis.recommendations)
                  ? document.analysis.recommendations.map(rec => 
                      typeof rec === 'string' 
                        ? rec 
                        : (rec.title || rec.description || 'Рекомендация')
                    ).join(', ')
                  : 'Рекомендации отсутствуют'
              }</p>
            </div>
          )}
        </div>
        
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-title">
              <h3>💬 Галина</h3>
              <p>Юридический помощник</p>
            </div>
          </div>
          
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.role}`}>
                <div className="message-content">
                  {message.content}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message assistant">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Задайте вопрос о документе..."
              disabled={isLoading}
              rows="3"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailView;
