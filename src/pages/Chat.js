import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Upload, FileText, Loader, Bot, Globe } from 'lucide-react';
import './Chat.css';

import { useChat } from '../hooks/useChat';
import { validateFile, extractTextFromFile, createDocumentObject } from '../utils/documentUtils';
import { loadSessions, createSession, getSessionById, upsertSession, generateTitleFromMessages } from '../utils/chatStorage';
import DocumentUpload from '../components/DocumentUpload';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { useAuth } from '../contexts/AuthContext';
// import { LanguageContext } from '../App';
// import translations from '../data/translations';

const Chat = () => {
  // const { lang } = useContext(LanguageContext);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [sessions, setSessions] = useState(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => loadSessions()[0]?.id || null);

  // Используем кастомные хуки
  const {
    messages,
    isLoading,
    sendMessage,
    addSystemMessage,
    clearChat,
    downloadDocument,
    apiStatus,
    useWebSearch,
    setUseWebSearch,
    setMessages
  } = useChat(user?.id || user?.email || null); // Передаем userId в useChat

  // Прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Инициализация активной сессии
  useEffect(() => {
    if (!activeSessionId) {
      const s = createSession();
      const updated = upsertSession(sessions, s);
      setSessions(updated);
      setActiveSessionId(s.id);
      setMessages([]);
    } else {
      const current = getSessionById(sessions, activeSessionId);
      if (current) setMessages(current.messages || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Сохраняем активную сессию при изменении сообщений
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return;

    const current = getSessionById(sessions, activeSessionId) || { id: activeSessionId };
    const updated = {
      ...current,
      title: generateTitleFromMessages(messages),
      messages,
      updatedAt: new Date().toISOString(),
      createdAt: current.createdAt || new Date().toISOString()
    };

    // Избегаем лишних обновлений, если данные не изменились
    const hasChanged =
      !current.title ||
      current.title !== updated.title ||
      !current.messages ||
      current.messages.length !== messages.length;

    if (hasChanged) {
      setSessions(prev => upsertSession(prev, updated));
    }
  }, [messages, activeSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Обработка извлеченного текста из документа
  const handleTextExtracted = useCallback((text, filename) => {
    // Создаем объект документа для возможного использования в будущем
    createDocumentObject(
      { name: filename, size: text.length, type: 'text/plain' },
      text
    );

    // Добавляем системное сообщение с небольшой задержкой, чтобы избежать конфликтов обновлений
    setTimeout(() => {
      addSystemMessage(
        `📄 Документ "${filename}" успешно загружен и обработан. Текст извлечен и готов к анализу.`
      );
    }, 100);
  }, [addSystemMessage]);

  // Принудительный переанализ
  const handleForceReanalyze = () => {
    const reanalyzeMessage = "Проанализируй документ заново с указанием конкретных пунктов, статей законов и готовых формулировок";
    sendMessage(reanalyzeMessage, true);
  };

  // Обработка отправки сообщения
  const handleSendMessage = (message) => {
    sendMessage(message);
  };

  

  // Обработка загрузки файла
  const handleFileUpload = async (file) => {
    try {
      validateFile(file);
      
      const text = await extractTextFromFile(file);
      // Создаем объект документа для возможного использования в будущем
      createDocumentObject(file, text);
      
      addSystemMessage(
        `📄 Файл "${file.name}" успешно загружен и обработан. Размер: ${(file.size / 1024).toFixed(1)}KB`
      );
      
      // Автоматически отправляем запрос на анализ
      const analysisMessage = `Проанализируй этот документ: ${text.substring(0, 500)}...`;
      sendMessage(analysisMessage);
      
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      addSystemMessage(`❌ Ошибка при загрузке файла: ${error.message}`);
    }
  };

  // Повторная отправка сообщения
  const handleRetryMessage = (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.type === 'bot') {
      // Находим предыдущее пользовательское сообщение
      const userMessageIndex = messages.findIndex(m => m.id === messageId) - 1;
      if (userMessageIndex >= 0) {
        const userMessage = messages[userMessageIndex];
        if (userMessage.type === 'user') {
          sendMessage(userMessage.content);
        }
      }
    }
  };

  // Переводы доступны при необходимости
  // const t = translations[lang] || translations.ru;

  const suggestions = [
    'Проверь договор аренды: риски и рекомендации',
    'Подскажи, как составить претензию по возврату денег',
    'Какие пункты добавить в договор оказания услуг?',
    'Разбери трудовой договор: права и обязанности сторон'
  ];

  return (
    <div className="chat-page">
      <div className="chat-container chat-layout">
        {/* Сайдбар сессий */}
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <strong>Чаты</strong>
            <button className="chat-header__button" onClick={() => {
              const s = createSession();
              const updated = upsertSession(sessions, s);
              setSessions(updated);
              setActiveSessionId(s.id);
              setMessages([]);
            }}>+</button>
          </div>
          <div className="sidebar-list">
            {sessions.map(s => (
              <div key={s.id} className={`sidebar-item ${activeSessionId === s.id ? 'active' : ''}`} onClick={() => {
                setActiveSessionId(s.id);
                setMessages(s.messages || []);
              }}>
                <div className="sidebar-item__title">{s.title || 'Новый чат'}</div>
                <div className="sidebar-item__time">{new Date(s.updatedAt).toLocaleString('ru-RU')}</div>
              </div>
            ))}
          </div>
        </aside>
        <div className="chat-main">
        {/* Заголовок чата */}
        <div className="chat-header">
          <div className="chat-header__left">
            <div>
              <h2>🤖 AI Юрист Галина</h2>
              <div className="chat-header__subtitle">Профессиональный анализ документов и экспертные юридические консультации</div>
            </div>
            <div className={`status-indicator ${apiStatus === 'connected' ? 'status-indicator--connected' : apiStatus === 'error' ? 'status-indicator--error' : ''}`}>
              {apiStatus === 'connected' ? 'Онлайн' : apiStatus === 'error' ? 'Ошибка соединения' : 'Онлайн'}
            </div>
          </div>

          <div className="chat-header__actions">
            <button
              className={`chat-header__button ${useWebSearch ? 'active' : ''}`}
              onClick={() => setUseWebSearch(!useWebSearch)}
              title={useWebSearch ? 'Веб-поиск включен' : 'Веб-поиск выключен'}
            >
              <Globe size={20} />
            </button>

            <button
              className="chat-header__button"
              onClick={() => setShowDocumentUpload(!showDocumentUpload)}
              title="Загрузить документ"
            >
              <Upload size={20} />
            </button>
            
            <button
              className="chat-header__button"
              onClick={handleForceReanalyze}
              disabled={isLoading}
              title="Переанализировать"
            >
              <RefreshCw size={20} className={isLoading ? 'spinning' : ''} />
            </button>
            
            <button
              className="chat-header__button"
              onClick={clearChat}
              title="Очистить чат"
            >
              <FileText size={20} />
            </button>
          </div>
        </div>

        {/* Загрузка документов */}
        {showDocumentUpload && (
          <div className="chat-document-upload">
            <DocumentUpload
              onFileUpload={handleFileUpload}
              onTextExtracted={handleTextExtracted}
              onClose={() => setShowDocumentUpload(false)}
            />
          </div>
        )}
          
        {/* Сообщения чата */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Bot size={48} />
              <h3>Добро пожаловать! 👋</h3>
              <p>Я Галина, ваш ИИ-юрист. Задайте мне любой юридический вопрос, и я помогу вам разобраться в ситуации.</p>
              <div className="chat-suggestions">
                {suggestions.map((s, i) => (
                  <button key={i} className="suggestion-chip" onClick={() => handleSendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={handleRetryMessage}
                onDownloadDocument={downloadDocument}
                isLastMessage={index === messages.length - 1}
              />
            ))
          )}
          
          {isLoading && (
            <div className="chat-loading">
              <Loader size={24} className="spinning" />
              <span>Галина думает...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Ввод сообщений */}
        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder="Задайте вопрос Галине..."
          disabled={isLoading}
        />
        </div>
      </div>
    </div>
  );
};

export default Chat; 