const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Сервис для управления профилями пользователей
 */
class UserProfileService {
  constructor() {
    this.profilesDir = path.join(__dirname, '../data/profiles');
    this.ensureProfilesDirectory();
  }

  /**
   * Создает директорию для профилей, если она не существует
   */
  async ensureProfilesDirectory() {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true });
    } catch (error) {
      logger.error('Ошибка создания директории профилей', { error: error.message });
    }
  }

  /**
   * Получает путь к файлу профиля пользователя
   * @param {string} userId - ID пользователя
   * @returns {string} Путь к файлу
   */
  getProfilePath(userId) {
    return path.join(this.profilesDir, `${userId}.json`);
  }

  /**
   * Получает профиль пользователя
   * @param {string} userId - ID пользователя
   * @returns {Object} Профиль пользователя
   */
  async getUserProfile(userId) {
    try {
      const profilePath = this.getProfilePath(userId);
      
      try {
        const profileData = await fs.readFile(profilePath, 'utf8');
        const profile = JSON.parse(profileData);
        
        logger.info('Профиль пользователя загружен', { 
          userId: this.maskUserId(userId),
          hasPersonalData: !!profile.personalData,
          caseNotesCount: profile.caseNotes ? profile.caseNotes.length : 0
        });
        
        return profile;
      } catch (error) {
        // Если файл не существует, создаем новый профиль
        if (error.code === 'ENOENT') {
          return this.createNewProfile(userId);
        }
        throw error;
      }
    } catch (error) {
      logger.error('Ошибка получения профиля пользователя', { 
        userId: this.maskUserId(userId), 
        error: error.message 
      });
      return this.createNewProfile(userId);
    }
  }

  /**
   * Создает новый профиль пользователя
   * @param {string} userId - ID пользователя
   * @returns {Object} Новый профиль
   */
  createNewProfile(userId) {
    return {
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personalData: {
        // Основная информация
        fullName: '',
        firstName: '',
        lastName: '',
        middleName: '',
        birthDate: '',
        birthPlace: '',
        
        // Контактная информация
        phone: '',
        email: '',
        address: '',
        
        // Документы
        passportSeries: '',
        passportNumber: '',
        inn: '',
        snils: '',
        
        // Дополнительная информация
        maritalStatus: '',
        occupation: '',
        workplace: ''
      },
      caseNotes: [],
      preferences: {
        autoSavePersonalData: true,
        dataRetentionDays: 365,
        privacyLevel: 'standard'
      },
      statistics: {
        totalMessages: 0,
        dataExtractionCount: 0,
        lastActivity: new Date().toISOString()
      }
    };
  }

  /**
   * Обновляет профиль пользователя
   * @param {string} userId - ID пользователя
   * @param {Object} updates - Обновления профиля
   * @returns {Object} Обновленный профиль
   */
  async updateUserProfile(userId, updates) {
    try {
      const profile = await this.getUserProfile(userId);
      
      // Объединяем существующие данные с новыми
      if (updates.personalData) {
        profile.personalData = { ...profile.personalData, ...updates.personalData };
      }
      
      if (updates.caseNotes) {
        profile.caseNotes = [...(profile.caseNotes || []), ...updates.caseNotes];
        
        // Ограничиваем количество заметок (последние 100)
        if (profile.caseNotes.length > 100) {
          profile.caseNotes = profile.caseNotes.slice(-100);
        }
      }
      
      if (updates.preferences) {
        profile.preferences = { ...profile.preferences, ...updates.preferences };
      }
      
      // Обновляем метаданные
      profile.updatedAt = new Date().toISOString();
      profile.statistics.lastActivity = new Date().toISOString();
      
      if (updates.personalData && Object.keys(updates.personalData).length > 0) {
        profile.statistics.dataExtractionCount += 1;
      }
      
      // Сохраняем профиль
      await this.saveUserProfile(userId, profile);
      
      logger.info('Профиль пользователя обновлен', {
        userId: this.maskUserId(userId),
        updatedFields: Object.keys(updates.personalData || {}),
        newCaseNotes: updates.caseNotes ? updates.caseNotes.length : 0
      });
      
      return profile;
    } catch (error) {
      logger.error('Ошибка обновления профиля пользователя', { 
        userId: this.maskUserId(userId), 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Сохраняет профиль пользователя в файл
   * @param {string} userId - ID пользователя
   * @param {Object} profile - Профиль для сохранения
   */
  async saveUserProfile(userId, profile) {
    try {
      const profilePath = this.getProfilePath(userId);
      await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf8');
    } catch (error) {
      logger.error('Ошибка сохранения профиля пользователя', { 
        userId: this.maskUserId(userId), 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Добавляет заметку о деле в профиль пользователя
   * @param {string} userId - ID пользователя
   * @param {string} content - Содержание заметки
   * @param {number} importance - Важность от 1 до 10
   * @returns {Object} Обновленный профиль
   */
  async addCaseNote(userId, content, importance = 5) {
    const caseNote = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      content: content,
      importance: importance,
      type: 'chat_extraction'
    };
    
    return await this.updateUserProfile(userId, {
      caseNotes: [caseNote]
    });
  }

  /**
   * Получает статистику по профилю пользователя
   * @param {string} userId - ID пользователя
   * @returns {Object} Статистика профиля
   */
  async getProfileStatistics(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      
      const personalDataFields = Object.values(profile.personalData).filter(value => value && value.trim());
      const recentCaseNotes = profile.caseNotes.filter(note => {
        const noteDate = new Date(note.timestamp);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return noteDate > weekAgo;
      });
      
      return {
        completeness: Math.round((personalDataFields.length / 12) * 100), // 12 основных полей
        totalCaseNotes: profile.caseNotes.length,
        recentCaseNotes: recentCaseNotes.length,
        lastUpdate: profile.updatedAt,
        dataExtractionCount: profile.statistics.dataExtractionCount
      };
    } catch (error) {
      logger.error('Ошибка получения статистики профиля', { 
        userId: this.maskUserId(userId), 
        error: error.message 
      });
      return {
        completeness: 0,
        totalCaseNotes: 0,
        recentCaseNotes: 0,
        lastUpdate: null,
        dataExtractionCount: 0
      };
    }
  }

  /**
   * Очищает старые данные из профиля в соответствии с настройками приватности
   * @param {string} userId - ID пользователя
   */
  async cleanupOldData(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      const retentionDays = profile.preferences.dataRetentionDays || 365;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      // Удаляем старые заметки
      const filteredNotes = profile.caseNotes.filter(note => {
        const noteDate = new Date(note.timestamp);
        return noteDate > cutoffDate;
      });
      
      if (filteredNotes.length !== profile.caseNotes.length) {
        profile.caseNotes = filteredNotes;
        await this.saveUserProfile(userId, profile);
        
        logger.info('Очищены старые данные профиля', {
          userId: this.maskUserId(userId),
          removedNotes: profile.caseNotes.length - filteredNotes.length
        });
      }
    } catch (error) {
      logger.error('Ошибка очистки старых данных профиля', { 
        userId: this.maskUserId(userId), 
        error: error.message 
      });
    }
  }

  /**
   * Экспортирует данные профиля пользователя
   * @param {string} userId - ID пользователя
   * @returns {Object} Данные профиля для экспорта
   */
  async exportUserData(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      
      return {
        exportedAt: new Date().toISOString(),
        personalData: profile.personalData,
        caseNotes: profile.caseNotes,
        preferences: profile.preferences,
        statistics: profile.statistics
      };
    } catch (error) {
      logger.error('Ошибка экспорта данных пользователя', { 
        userId: this.maskUserId(userId), 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Удаляет профиль пользователя
   * @param {string} userId - ID пользователя
   */
  async deleteUserProfile(userId) {
    try {
      const profilePath = this.getProfilePath(userId);
      await fs.unlink(profilePath);
      
      logger.info('Профиль пользователя удален', { 
        userId: this.maskUserId(userId) 
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Ошибка удаления профиля пользователя', { 
          userId: this.maskUserId(userId), 
          error: error.message 
        });
        throw error;
      }
    }
  }

  /**
   * Маскирует ID пользователя для логирования
   * @param {string} userId - ID пользователя
   * @returns {string} Замаскированный ID
   */
  maskUserId(userId) {
    if (!userId || userId.length < 6) return '***';
    return `${userId.slice(0, 3)}***${userId.slice(-3)}`;
  }
}

module.exports = UserProfileService;

