import React, { useState, useRef, useEffect } from 'react';
import { Headphones, Play, Pause, Square, AlertTriangle, CheckCircle, Info, Clock, User, Target, Save } from 'lucide-react';
import './CourtHearing.css';

const CourtHearing = ({ isOpen, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hearingData, setHearingData] = useState({
    participants: [],
    errors: [],
    recommendations: [],
    timeline: [],
    analysis: null
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [savedFileInfo, setSavedFileInfo] = useState(null);
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.timerId) {
        clearInterval(mediaRecorderRef.current.timerId);
      }
    };
  }, []);

  // Реальный анализ судебного заседания
  const analyzeHearing = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Имитируем процесс анализа
      const analysisSteps = [
        { progress: 20, message: 'Анализирую участников заседания...' },
        { progress: 40, message: 'Выявляю процессуальные ошибки...' },
        { progress: 60, message: 'Анализирую доказательную базу...' },
        { progress: 80, message: 'Формирую рекомендации...' },
        { progress: 100, message: 'Анализ завершен' }
      ];

      for (let i = 0; i < analysisSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalysisProgress(analysisSteps[i].progress);
      }

      // Проверяем, есть ли записанное аудио
      if (!audioRef.current?.src) {
        throw new Error('Нет записанного аудио для анализа');
      }

      // Создаем FormData для отправки аудио файла
      const formData = new FormData();
      
      // Получаем blob из аудио элемента
      const audioResponse = await fetch(audioRef.current.src);
      const audioBlob = await audioResponse.blob();
      
      formData.append('audio', audioBlob, 'hearing.wav');

      // Вызываем API для анализа аудио
      const response = await fetch('http://localhost:3006/court/analyze-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.analysis) {
        setHearingData(result.analysis);
        // Сохраняем информацию о файле
        if (result.fileInfo) {
          setSavedFileInfo(result.fileInfo);
        }
      } else {
        throw new Error('Неверный формат ответа от сервера');
      }

    } catch (error) {
      console.error('Ошибка анализа:', error);
      
      // В случае ошибки показываем базовый анализ
              const fallbackAnalysis = {
          participants: [
            { role: 'Судья', name: 'Иванов И.И.', errors: ['Ошибка анализа аудио', 'Используется базовый анализ'] },
            { role: 'Прокурор', name: 'Петров П.П.', errors: ['Не удалось распознать речь', 'Требуется качественная запись'] }
          ],
          errors: [
            { type: 'critical', message: 'Ошибка анализа аудио', participant: 'Система', time: '--:--' },
            { type: 'warning', message: 'Используется базовый анализ', participant: 'Система', time: '--:--' }
          ],
          recommendations: [
            'Улучшить качество аудио записи',
            'Проверить микрофон',
            'Попробовать записать заново'
          ],
          timeline: [
            { time: '--:--', event: 'Ошибка анализа аудио', type: 'error' }
          ],
          analysis: {
            overallScore: 0,
            criticalErrors: 1,
            warnings: 1,
            recommendations: 3,
            summary: 'Произошла ошибка при анализе аудио. Проверьте качество записи.'
          }
        };
      
      setHearingData(fallbackAnalysis);
    }

    setIsAnalyzing(false);
  };

  // Начать прослушивание
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setCurrentTime(0);
      setDuration(0);
      setAnalysisProgress(0); // Сбрасываем прогресс анализа
      
      // Запускаем таймер записи
      const timer = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
      
      // Сохраняем ID таймера для остановки
      mediaRecorderRef.current.timerId = timer;
    } catch (error) {
      console.error('Ошибка при записи аудио:', error);
    }
  };

  // Остановить прослушивание
  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      // Останавливаем таймер
      if (mediaRecorderRef.current.timerId) {
        clearInterval(mediaRecorderRef.current.timerId);
        mediaRecorderRef.current.timerId = null;
      }
      
      // Останавливаем запись
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsListening(false);
    }
  };

  // Воспроизвести запись
  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Остановить воспроизведение
  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Форматирование времени
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="court-hearing-overlay">
      <div className="court-hearing-modal">
        <div className="court-hearing-header">
          <div className="header-content">
            <Headphones size={24} />
            <h2>Прослушивание судебного заседания</h2>
            <p>Анализ процесса и выявление ошибок</p>
          </div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="court-hearing-content">
          {/* Панель управления */}
          <div className="control-panel">
            <div className="recording-controls">
              {!isListening ? (
                <button 
                  className="control-button record"
                  onClick={startListening}
                >
                  <Play size={20} />
                  Начать запись
                </button>
              ) : (
                <button 
                  className="control-button stop"
                  onClick={stopListening}
                >
                  <Square size={20} />
                  Остановить запись
                </button>
              )}
            </div>

            <div className="playback-controls">
              <button 
                className="control-button play"
                onClick={isPlaying ? pauseRecording : playRecording}
                disabled={!audioRef.current?.src}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                {isPlaying ? 'Пауза' : 'Воспроизвести'}
              </button>
            </div>

            <div className="timer">
              <Clock size={16} />
              <span>{formatTime(currentTime)}</span>
            </div>
          </div>

          {/* Статус записи */}
          {isListening && (
            <div className="recording-status">
              <div className="recording-indicator">
                <div className="pulse-dot"></div>
                <span>Запись в процессе...</span>
              </div>
            </div>
          )}

          {/* Кнопка анализа */}
          {!isListening && currentTime > 0 && (
            <div className="analysis-section">
              <button 
                className="analyze-button"
                onClick={analyzeHearing}
                disabled={isAnalyzing}
              >
                <Target size={20} />
                {isAnalyzing ? 'Анализирую...' : 'Анализировать заседание'}
              </button>
              
              {isAnalyzing && (
                <div className="analysis-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${analysisProgress}%` }}
                    ></div>
                  </div>
                  <span>{analysisProgress}%</span>
                </div>
              )}
            </div>
          )}

          {/* Результаты анализа */}
          {hearingData.analysis && !isAnalyzing && (
            <div className="analysis-results">
              <div className="results-header">
                <h3>Результаты анализа</h3>
                <div className="overall-score">
                  <span>Общая оценка:</span>
                  <div className="score">{hearingData.analysis.overallScore}/100</div>
                </div>
              </div>

              <div className="results-grid">
                {/* Участники */}
                <div className="results-section">
                  <h4>
                    <User size={16} />
                    Участники заседания
                  </h4>
                  <div className="participants-list">
                    {hearingData.participants.map((participant, index) => (
                      <div key={index} className="participant-item">
                        <div className="participant-header">
                          <span className="role">{participant.role}</span>
                          <span className="name">{participant.name}</span>
                        </div>
                        <div className="errors-list">
                          {participant.errors.map((error, errorIndex) => (
                            <div key={errorIndex} className="error-item">
                              <AlertTriangle size={12} />
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ошибки */}
                <div className="results-section">
                  <h4>
                    <AlertTriangle size={16} />
                    Выявленные ошибки
                  </h4>
                  <div className="errors-timeline">
                    {hearingData.errors.map((error, index) => (
                      <div key={index} className={`error-timeline-item ${error.type}`}>
                        <div className="error-time">{error.time}</div>
                        <div className="error-content">
                          <div className="error-message">{error.message}</div>
                          <div className="error-participant">{error.participant}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Рекомендации */}
                <div className="results-section">
                  <h4>
                    <CheckCircle size={16} />
                    Рекомендации
                  </h4>
                  <div className="recommendations-list">
                    {hearingData.recommendations.map((rec, index) => (
                      <div key={index} className="recommendation-item">
                        <CheckCircle size={14} />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Хронология */}
                <div className="results-section">
                  <h4>
                    <Clock size={16} />
                    Хронология заседания
                  </h4>
                  <div className="timeline">
                    {hearingData.timeline.map((event, index) => (
                      <div key={index} className={`timeline-item ${event.type}`}>
                        <div className="timeline-time">{event.time}</div>
                        <div className="timeline-event">{event.event}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Итоговый анализ */}
              <div className="final-analysis">
                <h4>
                  <Info size={16} />
                  Итоговый анализ
                </h4>
                <p>{hearingData.analysis.summary}</p>
              </div>

              {/* Информация о сохраненном файле */}
              {savedFileInfo && (
                <div className="saved-file-info">
                  <h4>
                    <Save size={16} />
                    Сохраненный файл
                  </h4>
                  <div className="file-details">
                    <div className="file-item">
                      <span className="label">Имя файла:</span>
                      <span className="value">{savedFileInfo.filename}</span>
                    </div>
                    <div className="file-item">
                      <span className="label">Размер:</span>
                      <span className="value">{(savedFileInfo.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="file-item">
                      <span className="label">Тип:</span>
                      <span className="value">{savedFileInfo.mimetype}</span>
                    </div>
                    <div className="file-item">
                      <span className="label">Дата записи:</span>
                      <span className="value">{new Date(savedFileInfo.uploadDate).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      </div>
    </div>
  );
};

export default CourtHearing; 