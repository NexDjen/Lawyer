/**
 * Компонент сайдбара для управления сессиями чата
 */
import React from 'react';
import { Plus } from 'lucide-react';
import './ChatSidebar.css';

/**
 * @param {Object} props
 * @param {Array} props.sessions - Список сессий
 * @param {string} props.activeSessionId - ID активной сессии
 * @param {Function} props.onSessionSelect - Обработчик выбора сессии
 * @param {Function} props.onNewSession - Обработчик создания новой сессии
 */
const ChatSidebar = ({ sessions, activeSessionId, onSessionSelect, onNewSession }) => {
  return (
    <aside className="chat-sidebar">
      <div className="sidebar-header">
        <strong>Чаты</strong>
        <button 
          className="sidebar-new-button" 
          onClick={onNewSession}
          title="Создать новый чат"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="sidebar-list">
        {sessions.length === 0 ? (
          <div className="sidebar-empty">
            <p>Нет активных чатов</p>
            <p className="sidebar-empty__hint">Создайте новый чат, чтобы начать</p>
          </div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id} 
              className={`sidebar-item ${activeSessionId === session.id ? 'active' : ''}`} 
              onClick={() => onSessionSelect(session.id)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onSessionSelect(session.id);
                }
              }}
            >
              <div className="sidebar-item__title">
                {session.title || 'Новый чат'}
              </div>
              <div className="sidebar-item__time">
                {new Date(session.updatedAt).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;



