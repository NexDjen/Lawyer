/**
 * Главный компонент чата с юристом Галиной
 * Рефакторенная версия с улучшенной архитектурой
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Chat.css';

// Hooks
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';

// Components
import ChatSidebar from '../components/ChatSidebar';
import ChatEmpty from '../components/ChatEmpty';
import ChatLoading from '../components/ChatLoading';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import DocumentUpload from '../components/DocumentUpload';

// Utils
import { validateFile, extractTextFromFile, createDocumentObject } from '../utils/documentUtils';
import { 
  loadSessions, 
  createSession, 
  getSessionById, 
  upsertSession, 
  generateTitleFromMessages 
} from '../utils/chatStorage';

/**
 * Компонент чата
 */
const Chat = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  
  // Состояние UI
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [sessions, setSessions] = useState(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => loadSessions()[0]?.id || null);

  // Хук чата
  const {
    messages,
    isLoading,
    sendMessage,
    addSystemMessage,
    downloadDocument,
    setMessages
  } = useChat(user?.id || user?.email || null);

  /**
   * Прокрутка к последнему сообщению
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Инициализация активной сессии
   */
  useEffect(() => {
    if (!activeSessionId) {
      const newSession = createSession();
      const updatedSessions = upsertSession(sessions, newSession);
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);
      setMessages([]);
    } else {
      const currentSession = getSessionById(sessions, activeSessionId);
      if (currentSession) {
        setMessages(currentSession.messages || []);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Сохранение активной сессии при изменении сообщений
   */
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return;

    const currentSession = getSessionById(sessions, activeSessionId) || { id: activeSessionId };
    const updatedSession = {
      ...currentSession,
      title: generateTitleFromMessages(messages),
      messages,
      updatedAt: new Date().toISOString(),
      createdAt: currentSession.createdAt || new Date().toISOString()
    };

    // Избегаем лишних обновлений
    const hasChanged =
      !currentSession.title ||
      currentSession.title !== updatedSession.title ||
      !currentSession.messages ||
      currentSession.messages.length !== messages.length;

    if (hasChanged) {
      setSessions(prev => upsertSession(prev, updatedSession));
    }
  }, [messages, activeSessionId, sessions]);

  /**
   * Автопрокрутка при изменении сообщений
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * Обработка создания новой сессии
   */
  const handleNewSession = useCallback(() => {
    const newSession = createSession();
    const updatedSessions = upsertSession(sessions, newSession);
    setSessions(updatedSessions);
    setActiveSessionId(newSession.id);
    setMessages([]);
  }, [sessions, setMessages]);

  /**
   * Обработка выбора сессии
   */
  const handleSessionSelect = useCallback((sessionId) => {
    setActiveSessionId(sessionId);
    const selectedSession = getSessionById(sessions, sessionId);
    if (selectedSession) {
      setMessages(selectedSession.messages || []);
    }
  }, [sessions, setMessages]);

  /**
   * Обработка отправки сообщения
   */
  const handleSendMessage = useCallback((message) => {
    sendMessage(message);
  }, [sendMessage]);

  /**
   * Обработка извлечения текста из документа
   */
  const handleTextExtracted = useCallback((text, filename) => {
    createDocumentObject(
      { name: filename, size: text.length, type: 'text/plain' },
      text
    );

    setTimeout(() => {
      addSystemMessage(
        `📄 Документ "${filename}" успешно загружен и обработан. Текст извлечен и готов к анализу.`
      );
    }, 100);
  }, [addSystemMessage]);

  /**
   * Обработка загрузки файла
   */
  const handleFileUpload = useCallback(async (file) => {
    try {
      validateFile(file);
      
      const text = await extractTextFromFile(file);
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
  }, [addSystemMessage, sendMessage]);

  /**
   * Повторная отправка сообщения
   */
  const handleRetryMessage = useCallback((messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.type === 'bot') {
      const userMessageIndex = messages.findIndex(m => m.id === messageId) - 1;
      if (userMessageIndex >= 0) {
        const userMessage = messages[userMessageIndex];
        if (userMessage.type === 'user') {
          sendMessage(userMessage.content);
        }
      }
    }
  }, [messages, sendMessage]);

  return (
    <div className="chat-page">
      <div className="chat-container chat-layout">
        {/* Сайдбар сессий */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
        />

        {/* Основная область чата */}
        <div className="chat-main">
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
              <ChatEmpty onSuggestionClick={handleSendMessage} />
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
            
            {/* Индикатор загрузки */}
            {isLoading && <ChatLoading />}
            
            {/* Якорь для автоскролла */}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода */}
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
