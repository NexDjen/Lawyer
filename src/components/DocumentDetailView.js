import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import AnalysisProgressBar from './AnalysisProgressBar';
import { downloadBlob } from '../utils/downloadUtils';
import './DocumentDetailView.css';
import AnalysisSummary from './AnalysisSummary';

const DocumentDetailView = ({ document, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [documentAnalysis, setDocumentAnalysis] = useState(null);
  const [showAnalysisProgress, setShowAnalysisProgress] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStage, setCurrentAnalysisStage] = useState('');
  const [generatingDocument, setGeneratingDocument] = useState(false);

  // Загружаем актуальные данные анализа при монтировании компонента
  useEffect(() => {
    const loadDocumentAnalysis = async () => {
      try {
        const response = await fetch(`/api/documents/${document.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setDocumentAnalysis(result.data.analysis);
            console.log('🔍 Loaded document analysis:', result.data.analysis);
          }
        }
      } catch (error) {
        console.error('Error loading document analysis:', error);
      }
    };
    
    if (document.id) {
      loadDocumentAnalysis();
    }
  }, [document.id]);

  // Функции перевода
  const translateSeverity = (severity) => {
    switch (severity) {
      case 'critical': return '🔴 Критический';
      case 'high': return '🔴 Высокий';
      case 'medium': return '🔵 Средний';
      case 'low': return '🟢 Низкий';
      default: return severity;
    }
  };

  // Функция для определения, нужна ли кнопка генерации документа
  const shouldShowGenerateButton = (recommendation) => {
    if (!recommendation || !recommendation.title) return false;
    
    // Проверяем поле requiresDocument если оно есть
    if (recommendation.requiresDocument !== undefined) {
      return recommendation.requiresDocument === true;
    }
    
    // Иначе проверяем по ключевым словам
    const title = recommendation.title.toLowerCase();
    const description = (recommendation.description || '').toLowerCase();
    const implementation = (recommendation.implementation || '').toLowerCase();
    const text = `${title} ${description} ${implementation}`;

    // Показываем кнопку если речь идет о создании документа
    return text.includes('жалоб') || 
           text.includes('заявлени') || 
           text.includes('исков') || 
           text.includes('ходатайств') ||
           text.includes('обращени') ||
           text.includes('претензи') ||
           text.includes('апелляци') ||
           text.includes('кассаци') ||
           text.includes('возражени') ||
           text.includes('отзыв');
  };

  // Функция для генерации документа
  const handleGenerateDocument = async (recommendation) => {
    try {
      setGeneratingDocument(true);
      
      const response = await fetch(buildApiUrl('documents/generate-legal-document'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recommendation,
          originalDocumentText: document.extractedText || document.content || '',
          analysis: documentAnalysis,
          userInfo: {
            name: '[ФИО заявителя]',
            address: '[Адрес заявителя]',
            phone: '[Телефон заявителя]',
            email: '[Email заявителя]'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ошибка генерации: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Проверяем, что мы в браузере
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          // Создаем blob из сгенерированного документа
          const blob = new Blob([result.data.generatedDocument], { type: 'text/plain;charset=utf-8' });
          const url = window.URL.createObjectURL(blob);
          downloadBlob(blob, result.data.fileName || 'документ.txt');
          window.URL.revokeObjectURL(url);

          alert(`✅ Документ "${result.data.documentType}" успешно сгенерирован и скачан!`);
        } else {
          // Fallback для случаев, когда document недоступен
          console.log('Сгенерированный документ:', result.data.generatedDocument);
          alert(`✅ Документ "${result.data.documentType}" успешно сгенерирован! Проверьте консоль для просмотра содержимого.`);
        }
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('Ошибка при генерации документа:', error);
      alert(`Ошибка при генерации документа: ${error.message}`);
    } finally {
      setGeneratingDocument(false);
    }
  };

  const translatePriority = (priority) => {
    switch (priority) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return priority;
    }
  };

  // Функция для запуска расширенного анализа с прогресс-баром
  const startAdvancedAnalysis = async () => {
    if (!document.extractedText && !document.recognizedText) {
      alert('Нет текста для анализа');
      return;
    }

    setShowAnalysisProgress(true);
    setAnalysisProgress(0);
    setCurrentAnalysisStage('starting');
    
    try {
      const textToAnalyze = document.extractedText || document.recognizedText || '';
      
      // Simulate progress stages
      setAnalysisProgress(10);
      setCurrentAnalysisStage('preprocessing');
      
      const response = await fetch(buildApiUrl('documents/advanced-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: textToAnalyze,
          documentType: 'legal',
          fileName: document.name || 'document',
          userId: '1'
        })
      });

      setAnalysisProgress(50);
      setCurrentAnalysisStage('analyzing');

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status}`);
      }

      const data = await response.json();
      
      setAnalysisProgress(80);
      setCurrentAnalysisStage('generating_report');
      
      if (data.success && data.data) {
        setDocumentAnalysis(data.data.analysis);
        setAnalysisProgress(100);
        setCurrentAnalysisStage('complete');
      }
      
    } catch (error) {
      console.error('Error in advanced analysis:', error);
      alert('Ошибка при анализе документа: ' + error.message);
      setShowAnalysisProgress(false);
      setAnalysisProgress(0);
    }
  };

  // Обработчик завершения прогресса
  const handleProgressComplete = () => {
    setShowAnalysisProgress(false);
  };

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
      // Отправляем запрос к LLM API
      const response = await fetch(buildApiUrl('chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          history: messages.slice(-10), // Последние 10 сообщений для контекста
          userId: '1',
          docId: document.id // ID документа для контекста
        })
      });

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || 'Извините, не удалось получить ответ от Галины.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Извините, произошла ошибка при обращении к Галине. Попробуйте еще раз.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
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

  // Используем актуальные данные анализа
  const analysis = documentAnalysis || document.analysis;

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
          
          {/* Progress Bar for Analysis */}
          <AnalysisProgressBar 
            isVisible={showAnalysisProgress}
            progress={analysisProgress}
            currentStage={currentAnalysisStage}
            onComplete={handleProgressComplete}
          />
          
          {/* Button to start analysis if no analysis exists */}
          {!analysis && !showAnalysisProgress && (
            <div className="analysis-start-container">
              <div className="analysis-start-card">
                <h3>🤖 Запустить ИИ анализ документа</h3>
                <p>Получите профессиональный анализ документа от Галины с выявлением рисков, ошибок и рекомендаций</p>
                <button 
                  className="start-analysis-btn"
                  onClick={startAdvancedAnalysis}
                >
                  🚀 Начать анализ
                </button>
              </div>
            </div>
          )}
          
          {documentAnalysis && !showAnalysisProgress && (
            <AnalysisSummary
              totalProblems={7}
              criticalCount={1}
              mediumCount={4}
              lowCount={2}
              recommendationsCount={3}
              riskLevel="Высокий"
            />
          )}
          
          {/* Expert Analysis Section */}
          {analysis && !showAnalysisProgress && (
            <div className="llm-analysis-container">
              <div className="analysis-header-new">
                <h3>📊 Экспертный анализ от Галины</h3>
                <p className="analysis-subtitle">Профессиональное заключение по документу</p>
              </div>
              
              {/* Expert Opinion */}
              {analysis?.expertOpinion && (
                <div className="analysis-section expert-opinion-section">
                  <div className="section-header">
                    <span className="section-icon">💼</span>
                    <h4>Экспертное мнение</h4>
                  </div>
                  <div className="section-content">
                    {/* Если expertOpinion — строка, рендерим напрямую */}
                    {typeof analysis.expertOpinion === 'string' ? (
                      <p className="expert-text">{analysis.expertOpinion}</p>
                    ) : (
                      <>  {/* Объект expertOpinion */}
                        <p className="expert-text">
                          {analysis.expertOpinion.overallAssessment || 'Нет информации'}
                        </p>
                        {Array.isArray(analysis.expertOpinion.criticalPoints) && analysis.expertOpinion.criticalPoints.length > 0 && (
                          <div className="critical-section">
                            <strong>Критические моменты:</strong>
                            <ul className="critical-list">
                              {analysis.expertOpinion.criticalPoints.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Legal Errors */}
              {analysis.legalErrors && analysis.legalErrors.length > 0 && (
                <div className="analysis-section errors-section">
                  <div className="section-header">
                    <span className="section-icon">⚠️</span>
                    <h4>Юридические ошибки ({analysis.legalErrors.length})</h4>
                  </div>
                  <div className="section-content">
                    {analysis.legalErrors.map((error, idx) => {
                      // Normalize error object to ensure strings are rendered
                      const rawError = typeof error === 'string' ? { error, severity: 'medium' } : error;
                      const errorObj = {
                        type: rawError.type || rawError.error || 'Ошибка',
                        description: rawError.description || rawError.error || rawError['pin-cite'] || '',
                        severity: rawError.severity || 'medium'
                      };
                      const severity = errorObj.severity;
                      
                      return (
                        <div key={idx} className={`error-box severity-${severity}`}>
                          <div className="error-header-new">
                            <span className="error-type-badge">{errorObj.type}</span>
                            <span className={`severity-badge severity-${severity}`}>{translateSeverity(severity)}</span>
                          </div>
                          <p className="error-text">{errorObj.description}</p>
                          {rawError.solution && !/консультац/i.test(rawError.solution) && (
                            <p className="error-meta"><strong>✅ Решение:</strong> {rawError.solution}</p>
                          )}
                          {rawError.basis && (
                            <p className="error-meta"><strong>📜 Основание:</strong> {rawError.basis}</p>
                          )}
                        </div>
                      );
                    })}
            </div>
          </div>
              )}
              
              {/* Risks */}
              {(() => {
                console.log('🔍 DocumentDetailView - document.analysis:', analysis);
                const rawRisks = Array.isArray(analysis.risks) ? analysis.risks : [];
                console.log('🔍 DocumentDetailView - rawRisks:', rawRisks);
                const visibleRisks = rawRisks
                  .map((risk) => {
                    if (typeof risk === 'string') return { title: risk, description: risk };
                    if (risk && risk.risk) return { title: risk.risk, description: risk.risk, probability: risk.probability, impact: risk.impact, category: risk.category };
                    return risk;
                  })
                  .filter((r) => r && (typeof r === 'string' ? r.trim().length > 0 : ((r.title || r.description || '').toString().trim().length > 0)));
                console.log('🔍 DocumentDetailView - visibleRisks:', visibleRisks);
                if (visibleRisks.length === 0) return null;
                return (
                <div className="analysis-section risks-section">
                  <div className="section-header">
                    <span className="section-icon">🚨</span>
                    <h4>Выявленные риски</h4>
                  </div>
                  <div className="risks-grid">
                    {visibleRisks.map((risk, idx) => {
                      // Normalize risk object: handle new shape with 'risk' field
                      let riskObj;
                      if (typeof risk === 'string') {
                        riskObj = { title: risk, description: risk, category: 'риск' };
                      } else if (risk && risk.risk) {
                        riskObj = {
                          title: risk.risk,
                          description: risk.risk,
                          category: risk.category || 'риск',
                          probability: risk.probability,
                          impact: risk.impact,
                          severity: risk.severity
                        };
                      } else {
                        riskObj = risk;
                      }
 
                       return (
                         <div key={idx} className="risk-card">
                           <div className="risk-title">
                             {riskObj.category && <span className="risk-category-badge">{riskObj.category}</span>}
                             {riskObj.title || riskObj.category || 'Неизвестный риск'}
                           </div>
                           <p className="risk-text">{riskObj.description || risk}</p>
                           {riskObj.probability && (
                             <p className="risk-meta"><strong>Вероятность:</strong> {riskObj.probability}</p>
                           )}
                           {riskObj.impact && (
                             <p className="risk-meta"><strong>Влияние:</strong> {riskObj.impact}</p>
                           )}
         </div>
       );
                     })}
                   </div>
                </div>
                );
              })()}
              
              {/* Recommendations */}
              {(() => {
                // Показываем рекомендации если они есть, или если есть nextSteps как fallback
                const hasRecommendations = analysis.recommendations && analysis.recommendations.length > 0;
                const hasNextSteps = analysis.nextSteps && analysis.nextSteps.length > 0;
                
                return hasRecommendations || hasNextSteps;
              })() && (
                <div className="analysis-section recommendations-section">
                  <div className="section-header">
                    <span className="section-icon">💡</span>
                    <h4>Рекомендации Галины</h4>
                  </div>
                  <div className="recommendations-list">
                    {/* Показываем рекомендации если они есть */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && 
                      // Показываем только рекомендации, адресованные клиенту, исключая информирование
                      analysis.recommendations
                        .filter(rec => rec.category?.toLowerCase() !== 'информирование')
                        .map((rec, idx) => {
                        // Normalize recommendation object
                        const recObj = typeof rec === 'object' && rec !== null ? rec : { title: String(rec), description: String(rec) };
                        const title = recObj.title || recObj.title || recObj.category || recObj.description;
                        // Галина выполняет все рекомендации сама
                        recObj.owner = 'Галина';
                        return (
                          <div key={idx} className={`recommendation-item priority-${recObj.priority || 'normal'}`}>
                            {/* Заголовок рекомендации */}
                            <h5 className="rec-title">
                              {title}
                              {recObj.priority && <span className={`priority-badge priority-${recObj.priority}`}>{translatePriority(recObj.priority)}</span>}
                            </h5>
                            
                            {/* Основное описание */}
                            {recObj.description && recObj.description !== title && (
                              <p className="rec-description">{recObj.description}</p>
                            )}
                            
                            {/* Подробные шаги */}
                            {recObj.steps && Array.isArray(recObj.steps) && recObj.steps.length > 0 && (
                              <div className="rec-steps">
                                <h6 className="steps-title">📋 Пошаговая инструкция:</h6>
                                <ol className="steps-list">
                                  {recObj.steps.map((step, stepIdx) => (
                                    <li key={stepIdx} className="step-item">
                                      <div className="step-header">
                                        <strong>{step.title || `Шаг ${step.step || stepIdx + 1}`}</strong>
                                        {step.timeframe && <span className="step-timeframe">⏱️ {step.timeframe}</span>}
                                      </div>
                                      {step.description && <p className="step-description">{step.description}</p>}
                                      {step.responsible && <p className="step-responsible"><strong>Ответственный:</strong> {step.responsible}</p>}
                                      {step.documents && Array.isArray(step.documents) && step.documents.length > 0 && (
                                        <p className="step-documents"><strong>Документы:</strong> {step.documents.join(', ')}</p>
                                      )}
                                      {step.notes && <p className="step-notes"><strong>Примечание:</strong> {step.notes}</p>}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            
                            {/* Метаинформация */}
                            <ul className="rec-meta-list">
                              {recObj.timeline && <li><strong>⏰ Общий срок:</strong> {recObj.timeline}</li>}
                              {recObj.deadline && <li><strong>📅 Крайний срок:</strong> {recObj.deadline}</li>}
                              {recObj.owner && <li><strong>👤 Ответственный:</strong> {recObj.owner}</li>}
                              {recObj.dependencies && recObj.dependencies.length > 0 && <li><strong>🔗 Зависимости:</strong> {recObj.dependencies.join(', ')}</li>}
                              {recObj.implementation && <li><strong>💡 Как реализовать:</strong> {recObj.implementation}</li>}
                              {recObj.risks && <li><strong>⚠️ Риски:</strong> {recObj.risks}</li>}
                              {recObj.successIndicators && <li><strong>✅ Признаки успеха:</strong> {recObj.successIndicators}</li>}
                            </ul>
                            
                            {/* Кнопка генерации документа */}
                            {shouldShowGenerateButton(recObj) && (
                              <button 
                                className="generate-document-btn"
                                onClick={() => handleGenerateDocument(recObj)}
                                disabled={generatingDocument}
                              >
                                {generatingDocument ? '⏳ Генерируем...' : '📄 Галина сгенерирует документ'}
                              </button>
                            )}
                          </div>
                        );
                      })
                    }
                    
                    {/* Показываем nextSteps как рекомендации если нет обычных рекомендаций */}
                    {(!analysis.recommendations || analysis.recommendations.length === 0) && 
                     analysis.nextSteps && analysis.nextSteps.length > 0 &&
                      analysis.nextSteps.map((step, idx) => {
                        const stepText = typeof step === 'string' ? step : (step.description || step.title || JSON.stringify(step));
                        return (
                          <div key={`nextstep-${idx}`} className="recommendation-item priority-normal">
                            <h5 className="rec-title">Следующий шаг {idx + 1}</h5>
                            <p className="rec-description">{stepText}</p>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}
              
              {/* Next Steps */}
              {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                <div className="analysis-section next-steps-section">
                  <div className="section-header">
                    <span className="section-icon">🎯</span>
                    <h4>Следующие шаги</h4>
          </div>
                  <ol className="steps-list">
                    {analysis.nextSteps.map((step, idx) => {
                      const stepText = typeof step === 'string' ? step : (step.description || step.title || JSON.stringify(step));
                      return <li key={idx}>{stepText}</li>;
                    })}
                  </ol>
        </div>
              )}
              
              {/* Compliance */}
              {analysis.compliance && (
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
          
          {/* Initial analysis blocks removed per request */}
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
                <div className="message-meta">
                  <div className="message-author">
                    {message.role === 'assistant' ? (
                      <>
                        <span className="author-name">Галина</span>
                        <span className="author-role">ЮРИДИЧЕСКИЙ ПОМОЩНИК</span>
                      </>
                    ) : (
                      <span className="author-name">Вы</span>
                    )}
                  </div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="message-content">
                  {message.content}
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
