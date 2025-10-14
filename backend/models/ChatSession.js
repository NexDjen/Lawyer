const database = require('../database/database');
const logger = require('../utils/logger');

class ChatSession {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.title = data.title;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.isActive = data.is_active;
  }

  // Создание новой сессии чата
  static async create(userId, title = 'Новый чат') {
    try {
      const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await database.run(`
        INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at, is_active)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      `, [id, userId, title]);

      logger.info('✅ Сессия чата создана:', { id, userId, title });
      return await ChatSession.findById(id);
    } catch (error) {
      logger.error('Ошибка создания сессии чата:', error);
      throw error;
    }
  }

  // Поиск сессии по ID
  static async findById(id) {
    try {
      const session = await database.get(`
        SELECT * FROM chat_sessions WHERE id = ? AND is_active = 1
      `, [id]);
      
      return session ? new ChatSession(session) : null;
    } catch (error) {
      logger.error('Ошибка поиска сессии по ID:', error);
      throw error;
    }
  }

  // Получение всех сессий пользователя
  static async findByUserId(userId, limit = 50, offset = 0) {
    try {
      const sessions = await database.all(`
        SELECT * FROM chat_sessions 
        WHERE user_id = ? AND is_active = 1
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);
      
      return sessions.map(session => new ChatSession(session));
    } catch (error) {
      logger.error('Ошибка получения сессий пользователя:', error);
      throw error;
    }
  }

  // Обновление сессии
  async update(updateData) {
    try {
      const allowedFields = ['title'];
      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        return this;
      }

      values.push(this.id);
      
      await database.run(`
        UPDATE chat_sessions 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, values);

      logger.info('✅ Сессия обновлена:', { id: this.id, updates });
      return await ChatSession.findById(this.id);
    } catch (error) {
      logger.error('Ошибка обновления сессии:', error);
      throw error;
    }
  }

  // Удаление сессии (мягкое удаление)
  async delete() {
    try {
      await database.run(`
        UPDATE chat_sessions 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [this.id]);

      logger.info('✅ Сессия удалена:', { id: this.id });
      return true;
    } catch (error) {
      logger.error('Ошибка удаления сессии:', error);
      throw error;
    }
  }

  // Получение сообщений сессии
  async getMessages(limit = 100, offset = 0) {
    try {
      const messages = await database.all(`
        SELECT * FROM chat_messages 
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `, [this.id, limit, offset]);
      
      return messages.map(message => ({
        id: message.id,
        type: message.type,
        content: message.content,
        audioUrl: message.audio_url,
        documentUrl: message.document_url,
        metadata: message.metadata ? JSON.parse(message.metadata) : {},
        createdAt: message.created_at
      }));
    } catch (error) {
      logger.error('Ошибка получения сообщений сессии:', error);
      return [];
    }
  }

  // Добавление сообщения в сессию
  async addMessage(messageData) {
    try {
      const { type, content, audioUrl, documentUrl, metadata = {} } = messageData;
      
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await database.run(`
        INSERT INTO chat_messages (id, session_id, user_id, type, content, audio_url, document_url, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [messageId, this.id, this.userId, type, content, audioUrl, documentUrl, JSON.stringify(metadata)]);

      // Обновляем время последнего обновления сессии
      await database.run(`
        UPDATE chat_sessions 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [this.id]);

      logger.info('✅ Сообщение добавлено в сессию:', { messageId, sessionId: this.id, type });
      return messageId;
    } catch (error) {
      logger.error('Ошибка добавления сообщения:', error);
      throw error;
    }
  }

  // Получение статистики сессии
  async getStats() {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as messages_count,
          COUNT(CASE WHEN type = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN type = 'bot' THEN 1 END) as bot_messages,
          COUNT(CASE WHEN type = 'system' THEN 1 END) as system_messages,
          MIN(created_at) as first_message,
          MAX(created_at) as last_message
        FROM chat_messages 
        WHERE session_id = ?
      `, [this.id]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики сессии:', error);
      return null;
    }
  }

  // Автоматическое обновление заголовка на основе сообщений
  async updateTitleFromMessages() {
    try {
      const messages = await this.getMessages(10, 0); // Последние 10 сообщений
      
      if (messages.length === 0) {
        return;
      }

      // Находим первое пользовательское сообщение
      const firstUserMessage = messages.find(msg => msg.type === 'user');
      if (!firstUserMessage) {
        return;
      }

      // Создаем заголовок на основе первого сообщения
      const title = firstUserMessage.content.length > 50 
        ? firstUserMessage.content.substring(0, 50) + '...'
        : firstUserMessage.content;

      await this.update({ title });
    } catch (error) {
      logger.error('Ошибка обновления заголовка сессии:', error);
    }
  }

  // Получение последних активных сессий пользователя
  static async getRecentSessions(userId, limit = 10) {
    try {
      const sessions = await database.all(`
        SELECT cs.*, 
               (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id) as messages_count,
               (SELECT content FROM chat_messages WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM chat_sessions cs
        WHERE cs.user_id = ? AND cs.is_active = 1
        ORDER BY cs.updated_at DESC
        LIMIT ?
      `, [userId, limit]);
      
      return sessions.map(session => ({
        id: session.id,
        title: session.title,
        messagesCount: session.messages_count,
        lastMessage: session.last_message,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }));
    } catch (error) {
      logger.error('Ошибка получения недавних сессий:', error);
      return [];
    }
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive
    };
  }
}

module.exports = ChatSession;
