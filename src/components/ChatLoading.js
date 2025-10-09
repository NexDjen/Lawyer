/**
 * Компонент индикатора загрузки для чата
 */
import React from 'react';
import { Loader } from 'lucide-react';
import { LOADING_MESSAGE } from '../constants/chat';
import './ChatLoading.css';

/**
 * @param {Object} props
 * @param {string} props.message - Сообщение загрузки (по умолчанию "Галина думает...")
 */
const ChatLoading = ({ message = LOADING_MESSAGE }) => {
  return (
    <div className="chat-loading">
      <div className="chat-loading__spinner">
        <Loader size={24} className="spinning" />
      </div>
      <span className="chat-loading__text">{message}</span>
    </div>
  );
};

export default ChatLoading;



