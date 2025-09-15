import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, Pause, Headphones, List } from 'lucide-react';
// import { LanguageContext } from '../App';
import CourtHearing from '../components/CourtHearing';
import AudioFilesList from '../components/AudioFilesList';
import './Lawyer.css';

const Lawyer = () => {

  const [, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [audioContext, setAudioContext] = useState(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [showAudioPermission, setShowAudioPermission] = useState(true);
  const [showCourtHearing, setShowCourtHearing] = useState(false);
  const [showAudioFilesList, setShowAudioFilesList] = useState(false);
  
  const speechRecognitionRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Инициализация Web Audio API при первом взаимодействии пользователя
  const initializeAudioContext = useCallback(() => {
    if (!audioContext && !userInteracted) {
      try {
        const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(newAudioContext);
        setUserInteracted(true);
        console.log('Web Audio API инициализирован');
      } catch (error) {
        console.error('Ошибка инициализации Web Audio API:', error);
      }
    }
  }, [userInteracted, audioContext]);

  // Обработчик разрешения аудио
  const handleAudioPermission = useCallback(async () => {
    try {
      // Создаем простой аудио контекст для получения разрешения
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Создаем простой синусоидальный сигнал
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Настраиваем параметры
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Низкая громкость
      
      // Воспроизводим короткий звук
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1); // 100ms
      
      console.log('Разрешение на аудио получено');
      setAudioPermissionGranted(true);
      setShowAudioPermission(false);
      
      // Инициализируем Web Audio API
      initializeAudioContext();
      
    } catch (error) {
      console.error('Ошибка при запросе разрешения аудио:', error);
      
      // Альтернативный подход - пробуем обычный Audio API
      try {
        const testAudio = new Audio();
        testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        
        testAudio.oncanplay = () => {
          console.log('Разрешение на аудио получено через Audio API');
          setAudioPermissionGranted(true);
          setShowAudioPermission(false);
          initializeAudioContext();
        };
        
        testAudio.onerror = () => {
          console.log('Используем альтернативный подход для разрешения аудио');
          setAudioPermissionGranted(true);
          setShowAudioPermission(false);
          initializeAudioContext();
        };
        
      } catch (audioError) {
        console.log('Используем альтернативный подход для разрешения аудио');
        setAudioPermissionGranted(true);
        setShowAudioPermission(false);
        initializeAudioContext();
      }
    }
  }, [initializeAudioContext]);

  // Автоматически скрываем кнопку разрешения после получения разрешения
  useEffect(() => {
    if (audioPermissionGranted) {
      setShowAudioPermission(false);
    }
  }, [audioPermissionGranted]);

  // Обработчик взаимодействия пользователя
  const handleUserInteraction = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
      initializeAudioContext();
      
      // Автоматически устанавливаем разрешение на аудио при первом взаимодействии
      if (!audioPermissionGranted) {
        setAudioPermissionGranted(true);
        setShowAudioPermission(false);
        console.log('Разрешение на аудио установлено автоматически');
      }
    }
  }, [userInteracted, audioPermissionGranted, initializeAudioContext]);

  // Fallback на браузерный TTS
  const fallbackToTTS = useCallback((responseText) => {
    console.log('Используем браузерный TTS как fallback');
    if ('speechSynthesis' in window && responseText) {
      const utterance = new SpeechSynthesisUtterance(responseText);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const voices = speechSynthesis.getVoices();
      const russianVoice = voices.find(voice => voice.lang.includes('ru'));
      if (russianVoice) {
        utterance.voice = russianVoice;
      }
      
      setIsSpeaking(true);
      setIsPlaying(true);
      speechSynthesis.speak(utterance);
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPlaying(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPlaying(false);
      };
    } else {
      setIsPlaying(false);
      setIsSpeaking(false);
    }
  }, []);


  // Стратегия автоматического воспроизведения
  const attemptAutoPlay = useCallback(async (audio, responseText) => {
    try {
      // Проверяем, есть ли разрешение на аудио и было ли взаимодействие пользователя
      if (!audioPermissionGranted && !userInteracted) {
        console.log('Нет разрешения на аудио, показываем кнопку разрешения');
        setShowAudioPermission(true);
        return false;
      }
      
      // Проверяем, что пользователь взаимодействовал с страницей
      if (!userInteracted) {
        console.log('Пользователь не взаимодействовал с страницей, пропускаем автовоспроизведение');
        setShowAudioPermission(true);
        return false;
      }
      
      // Стратегия 1: Прямое воспроизведение с проверкой готовности
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
        await audio.play();
        console.log('Автоматическое воспроизведение успешно');
        return true;
      } else {
        // Ждем готовности аудио
        return new Promise((resolve) => {
          audio.oncanplay = async () => {
            try {
              await audio.play();
              console.log('Автоматическое воспроизведение успешно');
              resolve(true);
            } catch (error) {
              console.error('Ошибка воспроизведения после готовности:', error);
              resolve(false);
            }
          };
        });
      }
    } catch (error) {
      console.error('Ошибка прямого воспроизведения:', error);
      
      // Стратегия 2: Web Audio API
      if (audioContext && audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          await audio.play();
          console.log('Воспроизведение через Web Audio API успешно');
          return true;
        } catch (webAudioError) {
          console.error('Ошибка Web Audio API:', webAudioError);
        }
      }
      
      // Стратегия 3: Fallback на TTS
      if (responseText) {
        console.log('Используем браузерный TTS как fallback');
        fallbackToTTS(responseText);
      }
      return false;
    }
  }, [audioPermissionGranted, userInteracted, audioContext, fallbackToTTS]);

  const stopAudio = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setIsSpeaking(false);
      setCurrentAudio(null);
    }
    // Останавливаем браузерный TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPlaying(false);
    }
    setShowAudioPermission(false);
  }, [currentAudio]);

  const playAudio = useCallback(async (audioUrl, responseText = '') => {
    try {
      console.log('Начинаем воспроизведение аудио:', audioUrl);
      
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      setIsPlaying(true);
      setIsSpeaking(true);

      audio.onended = () => {
        console.log('Аудио воспроизведение завершено');
        setIsPlaying(false);
        setIsSpeaking(false);
        setCurrentAudio(null);
        setShowAudioPermission(false);
      };

      audio.onerror = (e) => {
        console.error('Ошибка воспроизведения аудио:', e);
        setIsPlaying(false);
        setIsSpeaking(false);
        setCurrentAudio(null);
        setShowAudioPermission(false);
      };

      audio.onloadstart = () => console.log('Аудио начало загрузки');
      audio.oncanplay = () => {
        console.log('Аудио готово к воспроизведению');
        
        // Автоматически воспроизводим если есть разрешение
        if (audioPermissionGranted || userInteracted) {
          attemptAutoPlay(audio, responseText);
        } else {
          // Если нет разрешения, показываем кнопку разрешения
          setShowAudioPermission(true);
        }
      };
      audio.onplay = () => console.log('Аудио начало воспроизведения');

      console.log('Аудио воспроизведение запущено');
    } catch (error) {
      console.error('Ошибка воспроизведения:', error);
      setIsPlaying(false);
      setIsSpeaking(false);
      if (responseText) {
        fallbackToTTS(responseText);
      }
    }
  }, [currentAudio, attemptAutoPlay, audioPermissionGranted, userInteracted, fallbackToTTS]);

  const sendToAI = useCallback(async (message) => {
    handleUserInteraction(); // Устанавливаем флаг взаимодействия
    setIsLoading(true);

    try {
      console.log('Отправка сообщения к AI:', message);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history: conversationHistory
        }),
      });

      console.log('Ответ сервера:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Ошибка отправки сообщения: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Данные ответа:', data);

      // setCurrentMessage(data.response); // Не отображаем текст ответа
      setConversationHistory(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: data.response }]);

      // Автоматически воспроизводим ответ
      if (data.audioUrl) {
        console.log('Воспроизведение аудио:', data.audioUrl);
        // Всегда пытаемся воспроизвести аудио
        await playAudio(data.audioUrl, data.response);
      } else {
        console.log('TTS недоступен, используем браузерный TTS');
        // Используем браузерный TTS как fallback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.response);
          utterance.lang = 'ru-RU';
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          // Находим русский голос
          const voices = speechSynthesis.getVoices();
          const russianVoice = voices.find(voice => voice.lang.includes('ru'));
          if (russianVoice) {
            utterance.voice = russianVoice;
          }
          
          setIsSpeaking(true);
          setIsPlaying(true);
          speechSynthesis.speak(utterance);
          
          utterance.onend = () => {
            setIsSpeaking(false);
            setIsPlaying(false);
          };
          
          utterance.onerror = () => {
            setIsSpeaking(false);
            setIsPlaying(false);
          };
        }
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      alert(`Ошибка отправки сообщения: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [conversationHistory, playAudio, handleUserInteraction]);

  const handleVoiceInput = useCallback(async (transcript) => {
    if (!transcript.trim()) return;

    handleUserInteraction(); // Устанавливаем флаг взаимодействия

    // Останавливаем текущее воспроизведение если AI говорит
    if (isSpeaking) {
      stopAudio();
    }

    // Отправляем запрос к AI
    await sendToAI(transcript);
  }, [isSpeaking, stopAudio, sendToAI, handleUserInteraction]);

  // Инициализация Web Speech API и обработка первого взаимодействия
  useEffect(() => {
    // Обработчик первого взаимодействия с страницей
    const handleFirstInteraction = () => {
      if (!userInteracted) {
        setUserInteracted(true);
        initializeAudioContext();
        
        // Автоматически устанавливаем разрешение на аудио
        if (!audioPermissionGranted) {
          setAudioPermissionGranted(true);
          setShowAudioPermission(false);
          console.log('Разрешение на аудио установлено при первом взаимодействии');
        }
      }
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      speechRecognitionRef.current = new SpeechRecognition();
      speechRecognitionRef.current.continuous = true;
      speechRecognitionRef.current.interimResults = true;
      speechRecognitionRef.current.lang = 'ru-RU';

      speechRecognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        handleUserInteraction(); // Устанавливаем флаг взаимодействия
        setIsListening(true);
      };

      speechRecognitionRef.current.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          console.log('Final transcript:', finalTranscript);
          handleUserInteraction(); // Устанавливаем флаг взаимодействия
          handleVoiceInput(finalTranscript);
        }
      };

      speechRecognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      speechRecognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        if (isContinuousMode) {
          // Перезапускаем распознавание в непрерывном режиме
          setTimeout(() => {
            if (isContinuousMode) {
              speechRecognitionRef.current.start();
            }
          }, 100);
        }
      };
    }

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [isContinuousMode, handleVoiceInput, userInteracted, initializeAudioContext, audioPermissionGranted, handleUserInteraction]);

  // Анимация градиентного круга
  useEffect(() => {
    const canvas = document.getElementById('gradientCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const time = Date.now() * 0.001;
      const intensity = isListening ? 0.8 : isSpeaking ? 0.6 : 0.3;
      
      // Создаем градиент
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      
      if (isListening) {
        // Зеленый градиент для слушания
        gradient.addColorStop(0, `rgba(34, 197, 94, ${intensity})`);
        gradient.addColorStop(0.5, `rgba(34, 197, 94, ${intensity * 0.5})`);
        gradient.addColorStop(1, `rgba(34, 197, 94, 0)`);
      } else if (isSpeaking) {
        // Синий градиент для речи
        gradient.addColorStop(0, `rgba(59, 130, 246, ${intensity})`);
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${intensity * 0.5})`);
        gradient.addColorStop(1, `rgba(59, 130, 246, 0)`);
      } else {
        // Нейтральный градиент
        gradient.addColorStop(0, `rgba(156, 163, 175, ${intensity})`);
        gradient.addColorStop(0.5, `rgba(156, 163, 175, ${intensity * 0.5})`);
        gradient.addColorStop(1, `rgba(156, 163, 175, 0)`);
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Добавляем пульсацию
      const pulseRadius = radius + Math.sin(time * 3) * 10 * intensity;
      ctx.strokeStyle = isListening ? 'rgba(34, 197, 94, 0.3)' : isSpeaking ? 'rgba(59, 130, 246, 0.3)' : 'rgba(156, 163, 175, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, isSpeaking]);

  const startContinuousMode = async () => {
    try {
      setUserInteracted(true); // Отмечаем пользовательское взаимодействие
      setIsContinuousMode(true);
      setIsListening(true);
      
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.start();
      }
    } catch (error) {
      console.error('Ошибка запуска непрерывного режима:', error);
      alert('Не удалось запустить непрерывный режим');
    }
  };

  const stopContinuousMode = () => {
    handleUserInteraction(); // Устанавливаем флаг взаимодействия
    setIsContinuousMode(false);
    setIsListening(false);
    
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
  };

  const interruptAI = () => {
    handleUserInteraction(); // Устанавливаем флаг взаимодействия
    if (isSpeaking) {
      stopAudio();
      console.log('AI прерван пользователем');
    }
  };

  return (
    <div className="lawyer-page" onClick={handleUserInteraction}>
      <div className="lawyer-container" onClick={handleUserInteraction}>
        <div className="lawyer-header">
          <h1>🎤 Голосовой Юрист</h1>
          <p>Непрерывное общение с AI-юристом голосом</p>
        </div>

        <div className="voice-interface">
          <div className="gradient-circle-container">
            <canvas 
              id="gradientCanvas" 
              width="400" 
              height="400" 
              className="gradient-canvas"
            />
            
            <div className="circle-content">
              {isLoading && (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <span>Юрист думает...</span>
                </div>
              )}
              
              {/* Убрали кнопку "Слушать ответ" - теперь автоматическое воспроизведение */}
              
              {!isLoading && !isSpeaking && !currentAudio && !showAudioPermission && (
                <div className="welcome-text">
                  <h3>Добро пожаловать!</h3>
                  <p>Нажмите кнопку для начала голосового диалога</p>
                </div>
              )}
              
              {showAudioPermission && !audioPermissionGranted && !userInteracted && (
                <div className="audio-permission-section">
                  <div className="permission-message">
                    <h3>🎵 Разрешить воспроизведение аудио</h3>
                    <p>Для автоматического воспроизведения ответов AI необходимо разрешить воспроизведение аудио</p>
                  </div>
                  <button 
                    className="permission-button"
                    onClick={handleAudioPermission}
                    title="Разрешить аудио"
                  >
                    <Volume2 size={32} />
                    <span>Разрешить аудио</span>
                  </button>
                </div>
              )}
              
              {/* Убрали кнопку воспроизведения - теперь аудио воспроизводится автоматически */}
            </div>
          </div>

          <div className="voice-controls">
            <button 
              className={`voice-button ${isContinuousMode ? 'active' : ''}`}
              onClick={() => {
                handleUserInteraction();
                if (isContinuousMode) {
                  stopContinuousMode();
                } else {
                  startContinuousMode();
                }
              }}
              disabled={isLoading}
            >
              {isContinuousMode ? <MicOff size={32} /> : <Mic size={32} />}
              <span>{isContinuousMode ? 'Остановить диалог' : 'Начать диалог'}</span>
            </button>
            
            <button 
              className="hearing-button"
              onClick={() => {
                handleUserInteraction();
                setShowCourtHearing(true);
              }}
              title="Прослушивание судебного заседания"
            >
              <Headphones size={32} />
              <span>Прослушивание</span>
            </button>
            
            <button 
              className="files-button"
              onClick={() => {
                handleUserInteraction();
                setShowAudioFilesList(true);
              }}
              title="Список аудиозаписей"
            >
              <List size={32} />
              <span>Записи</span>
            </button>
            
            {isSpeaking && (
              <button 
                className="interrupt-button"
                onClick={() => {
                  handleUserInteraction();
                  interruptAI();
                }}
                title="Прервать AI"
              >
                <Pause size={24} />
                <span>Прервать</span>
              </button>
            )}
          </div>

          <div className="status-indicators">
            {isContinuousMode && (
              <div className={`status-indicator ${isListening ? 'listening' : 'idle'}`}>
                {isListening ? (
                  <>
                    <Mic size={16} className="pulse" />
                    <span>Слушаю...</span>
                  </>
                ) : (
                  <>
                    <MicOff size={16} />
                    <span>Ожидание...</span>
                  </>
                )}
              </div>
            )}
            
            {isSpeaking && (
              <div className="status-indicator speaking">
                <Volume2 size={16} className="pulse" />
                <span>AI говорит</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Модальное окно прослушивания судебного заседания */}
      <CourtHearing 
        isOpen={showCourtHearing}
        onClose={() => setShowCourtHearing(false)}
      />
      
      {/* Модальное окно списка аудио файлов */}
      <AudioFilesList
        isOpen={showAudioFilesList}
        onClose={() => setShowAudioFilesList(false)}
      />
    </div>
  );
};

export default Lawyer; 