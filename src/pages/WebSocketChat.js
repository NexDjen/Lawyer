import React, { useState, useRef, useEffect } from 'react';
import { useWebSocketChat } from '../hooks/useWebSocketChat';
import './WebSocketChat.css';

const WebSocketChat = () => {
  const {
    isConnected,
    messages,
    isLoading,
    error,
    isAudioEnabled,
    sendMessage,
    initializeAudioContext,
    reconnectAttempts
  } = useWebSocketChat();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading && isConnected) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleEnableVoice = async () => {
    try {
      await initializeAudioContext();
    } catch (error) {
      console.error('Failed to enable voice:', error);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConnectionStatus = () => {
    if (!isConnected) {
      return reconnectAttempts > 0 
        ? `🔴 Переподключение... (${reconnectAttempts}/5)`
        : '🔴 Отключено';
    }
    return '🟢 Подключено';
  };

  return (
    <div className="websocket-chat">
      <div className="chat-header">
        <h2>Windex-Юрист - Живой Диалог</h2>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {getConnectionStatus()}
          </span>
          {!isAudioEnabled && (
            <button
              className="enable-voice-btn"
              onClick={handleEnableVoice}
              disabled={!isConnected}
            >
              🎤 Включить голос
            </button>
          )}
          {isAudioEnabled && (
            <span className="voice-enabled">🎤 Голос включен</span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
          {!isConnected && reconnectAttempts < 5 && (
            <div className="reconnect-info">
              Попытка переподключения через 2 секунды...
            </div>
          )}
        </div>
      )}

      <div className="messages-container">
        {messages.length === 0 && !isLoading && (
          <div className="welcome-message">
            <h3>Добро пожаловать!</h3>
            <p>Задайте любой юридический вопрос, и AI юрист Галина ответит вам голосом.</p>
            <p>💡 <strong>Совет:</strong> Включите голос для полного погружения в диалог.</p>
            {!isConnected && (
              <div className="connection-warning">
                ⚠️ Ожидание подключения к серверу...
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.type === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
            <div className="message-avatar">
              {message.type === 'user' ? '👤' : '⚖️'}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="message-avatar">⚖️</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isConnected ? "Задайте юридический вопрос..." : "Ожидание подключения..."}
            disabled={!isConnected || isLoading}
            className="message-input"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </form>

      <div className="chat-info">
        <p>
          💡 <strong>Особенности:</strong>
        </p>
        <ul>
          <li>🎤 Автоматическая озвучка ответов</li>
          <li>⚡ Мгновенная доставка аудио</li>
          <li>🔗 Постоянное соединение</li>
          <li>🎯 Точные юридические консультации</li>
          <li>🔄 Автоматическое переподключение</li>
        </ul>
      </div>
    </div>
  );
};

export default WebSocketChat; 