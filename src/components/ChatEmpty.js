/**
 * Компонент пустого состояния чата с приветствием и подсказками
 */
import React from 'react';
import { WELCOME_MESSAGE, SUGGESTIONS } from '../constants/chat';
import './ChatEmpty.css';

/**
 * @param {Object} props
 * @param {Function} props.onSuggestionClick - Обработчик клика по подсказке
 */
const ChatEmpty = ({ onSuggestionClick }) => {
  return (
    <div className="chat-empty">
      <h3 className="chat-empty__title">{WELCOME_MESSAGE.title}</h3>
      
      <p className="chat-empty__description">
        {WELCOME_MESSAGE.description}
      </p>
      
      <div className="chat-suggestions">
        <div className="chat-suggestions__label">
          💡 Попробуйте спросить:
        </div>
        {SUGGESTIONS.map((suggestion, index) => (
          <button 
            key={index} 
            className="suggestion-chip" 
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatEmpty;

