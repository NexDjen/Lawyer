import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useWebSocketChat = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBuffersRef = useRef(new Map());
  const audioElementsRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;

  // Обработка текстовых сообщений
  const handleTextMessage = (data) => {
    setMessages(prev => [...prev, {
      id: data.id,
      type: 'assistant',
      content: data.text,
      timestamp: new Date()
    }]);
    setIsLoading(false);
  };

  // Обработка начала аудио стрима
  const handleAudioStart = (data) => {
    console.log('Audio streaming started for message:', data.id);
    
    try {
      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);
      const audio = new Audio(audioUrl);
      
      mediaSourceRef.current = mediaSource;
      audioElementsRef.current.set(data.id, audio);
      
      mediaSource.addEventListener('sourceopen', () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/ogg; codecs="opus"');
          sourceBuffersRef.current.set(data.id, sourceBuffer);
          
          audio.play().catch(error => {
            console.error('Failed to play audio:', error);
          });
        } catch (error) {
          console.error('Error creating source buffer:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up audio stream:', error);
    }
  };

  // Обработка аудио чанков
  const handleAudioChunk = (chunk) => {
    const lastId = Array.from(sourceBuffersRef.current.keys()).pop();
    if (lastId && sourceBuffersRef.current.has(lastId)) {
      const sourceBuffer = sourceBuffersRef.current.get(lastId);
      if (sourceBuffer && !sourceBuffer.updating) {
        try {
          sourceBuffer.appendBuffer(chunk);
        } catch (error) {
          console.error('Error appending audio chunk:', error);
        }
      }
    }
  };

  // Обработка окончания аудио
  const handleAudioEnd = (data) => {
    console.log('Audio streaming completed for message:', data.id);
    
    const sourceBuffer = sourceBuffersRef.current.get(data.id);
    const mediaSource = mediaSourceRef.current;
    
    if (sourceBuffer && mediaSource && mediaSource.readyState === 'open') {
      try {
        mediaSource.endOfStream();
      } catch (error) {
        console.error('Error ending media stream:', error);
      }
    }
    
    sourceBuffersRef.current.delete(data.id);
    audioElementsRef.current.delete(data.id);
  };

  // Обработка ошибок аудио
  const handleAudioError = (data) => {
    console.error('Audio streaming error:', data.error);
    setError(`Ошибка озвучки: ${data.error}`);
  };

  // Основной обработчик WebSocket сообщений
  const handleWebSocketMessage = (event) => {
    try {
      // Проверяем, является ли сообщение бинарным (аудио данные)
      if (event.data instanceof ArrayBuffer) {
        handleAudioChunk(event.data);
        return;
      }
      
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      switch (data.type) {
        case 'message-received':
          setIsLoading(true);
          break;
          
        case 'text':
          handleTextMessage(data);
          break;
          
        case 'audio-start':
          handleAudioStart(data);
          break;
          
        case 'audio-end':
          handleAudioEnd(data);
          break;
          
        case 'audio-error':
          handleAudioError(data);
          break;
          
        case 'error':
          setError(data.message);
          setIsLoading(false);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      // Не показываем ошибки парсинга для бинарных данных
      if (!error.message.includes('Unexpected identifier')) {
        setError(`Ошибка обработки сообщения: ${error.message}`);
      }
    }
  };

  // Функция переподключения
  const reconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setError('Превышено максимальное количество попыток переподключения');
      return;
    }

    console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connectWebSocket();
    }, reconnectDelay);
  };

  // Подключение к WebSocket
  const connectWebSocket = () => {
    try {
      // Закрываем существующее соединение
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // If explicit WS URL is provided, use it
      const explicitWsUrl = process.env.REACT_APP_WS_URL;
      let wsUrl;
      if (explicitWsUrl) {
        wsUrl = explicitWsUrl.replace(/\/$/, '') + '/api/ws';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // In development, connect to backend port directly
        // In production, use reverse proxy (no port needed)
        if (process.env.NODE_ENV === 'development' && window.location.port) {
          // Development: use backend port from REACT_APP_API_URL or default 3007
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3007/api';
          const backendUrl = new URL(apiUrl);
          wsUrl = `${protocol}//${backendUrl.host}/api/ws`;
        } else {
          // Production: use same host through reverse proxy (w-lawyer.ru/api/ws)
          wsUrl = `${protocol}//${window.location.hostname}/api/ws`;
        }
      }
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Переподключаемся только если это не было намеренное закрытие
        if (event.code !== 1000) {
          reconnect();
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Ошибка соединения');
        setIsConnected(false);
      };
      
      wsRef.current.onmessage = handleWebSocketMessage;
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setError('Ошибка создания соединения');
    }
  };

  // Отправка сообщения
  const sendMessage = (message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Соединение не установлено');
      return;
    }
    
    try {
      const messageData = {
        type: 'chat',
        message,
        history: messages.map(msg => ({
          type: msg.type,
          content: msg.content
        }))
      };
      
      wsRef.current.send(JSON.stringify(messageData));
      
      // Добавляем сообщение пользователя
      setMessages(prev => [...prev, {
        id: `user_${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: new Date()
      }]);
      
      setIsLoading(true);
      setError(null);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Ошибка отправки сообщения');
    }
  };

  // Инициализация AudioContext
  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        await audioContextRef.current.resume();
        setIsAudioEnabled(true);
        console.log('AudioContext initialized and resumed');
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        setError('Не удалось инициализировать аудио');
      }
    }
  };

  // Подключение при монтировании и после авторизации
  useEffect(() => {
    // Подключаемся только если пользователь авторизован и загрузка завершена
    if (!authLoading && user) {
      connectWebSocket();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    messages,
    isLoading,
    error,
    isAudioEnabled,
    sendMessage,
    initializeAudioContext,
    reconnectAttempts
  };
}; 