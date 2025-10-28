import React, { useState, useEffect } from 'react';
import './AnalysisProgressBar.css';

/**
 * Real-time analysis progress bar
 * Shows actual progress from backend analysis process
 */
const AnalysisProgressBar = ({ isVisible, progress = 0, currentStage = '', onComplete }) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [logs, setLogs] = useState([]);

  // Analysis stages mapping
  const stages = {
    'starting': { name: 'Инициализация анализа', icon: '🚀', order: 0 },
    'preprocessing': { name: 'Предобработка документа', icon: '⚙️', order: 1 },
    'analyzing': { name: 'Анализ документа', icon: '🔍', order: 2 },
    'generating_report': { name: 'Генерация отчета', icon: '📊', order: 3 },
    'complete': { name: 'Анализ завершен', icon: '✅', order: 4 }
  };

  // Smooth progress animation
  useEffect(() => {
    if (displayProgress < progress) {
      const timer = setTimeout(() => {
        setDisplayProgress(prev => Math.min(prev + 1, progress));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress]);

  // Add log when stage changes
  useEffect(() => {
    if (currentStage && stages[currentStage]) {
      const stageInfo = stages[currentStage];
      setLogs(prev => [...prev, {
        id: Date.now(),
        stage: currentStage,
        message: stageInfo.name,
        icon: stageInfo.icon,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }, [currentStage]);

  // Call onComplete when progress reaches 100%
  useEffect(() => {
    if (progress >= 100 && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  // Reset state when hidden
  useEffect(() => {
    if (!isVisible) {
      setDisplayProgress(0);
      setLogs([]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const currentStageInfo = stages[currentStage] || { name: 'Обработка...', icon: '⏳' };
  const currentOrder = currentStageInfo.order || 0;

  return (
    <div className="analysis-progress-container">
      <div className="analysis-progress-header">
        <h3>🤖 ИИ анализирует документ...</h3>
        <p className="progress-message">
          {currentStageInfo.icon} {currentStageInfo.name}
        </p>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <div className="progress-percentage">{Math.round(displayProgress)}%</div>
      </div>

      <div className="analysis-steps">
        {Object.entries(stages).map(([key, stage]) => {
          const isActive = stage.order === currentOrder;
          const isCompleted = stage.order < currentOrder;
          
          return (
            <div 
              key={key}
              className={`analysis-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <span className="step-icon">{stage.icon}</span>
              <span className="step-name">{stage.name}</span>
              {isCompleted && <span className="step-check">✓</span>}
            </div>
          );
        })}
      </div>

      {logs.length > 0 && (
        <div className="analysis-logs">
          <h4>📋 Лог анализа:</h4>
          <div className="logs-container">
            {logs.map(log => (
              <div key={log.id} className="log-entry">
                <span className="log-time">{log.timestamp}</span>
                <span className="log-icon">{log.icon}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgressBar;
