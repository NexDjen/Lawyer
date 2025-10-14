const database = require('../database/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'user';
    this.avatar = data.avatar;
    this.phone = data.phone;
    this.address = data.address;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.lastLogin = data.last_login;
    this.isActive = data.is_active;
  }

  // Создание нового пользователя
  static async create(userData) {
    try {
      const { name, email, password, role = 'user' } = userData;
      
      // Проверяем, существует ли пользователь с таким email
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
      }

      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await database.run(`
        INSERT INTO users (id, name, email, password, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [id, name, email, hashedPassword, role]);

      // Создаем профиль пользователя
      await database.run(`
        INSERT INTO user_profiles (id, user_id, personal_data, case_notes, preferences)
        VALUES (?, ?, '{}', '[]', '{}')
      `, [`profile_${id}`, id]);

      logger.info('✅ Пользователь создан:', { id, email, role });
      return await User.findById(id);
    } catch (error) {
      logger.error('Ошибка создания пользователя:', error);
      throw error;
    }
  }

  // Поиск пользователя по ID
  static async findById(id) {
    try {
      const user = await database.get(`
        SELECT * FROM users WHERE id = ? AND is_active = 1
      `, [id]);
      
      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Ошибка поиска пользователя по ID:', error);
      throw error;
    }
  }

  // Поиск пользователя по email
  static async findByEmail(email) {
    try {
      const user = await database.get(`
        SELECT * FROM users WHERE email = ? AND is_active = 1
      `, [email]);
      
      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Ошибка поиска пользователя по email:', error);
      throw error;
    }
  }

  // Получение всех пользователей
  static async findAll(limit = 100, offset = 0) {
    try {
      const users = await database.all(`
        SELECT id, name, email, role, avatar, phone, address, 
               created_at, updated_at, last_login, is_active
        FROM users 
        WHERE is_active = 1
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      return users.map(user => new User(user));
    } catch (error) {
      logger.error('Ошибка получения списка пользователей:', error);
      throw error;
    }
  }

  // Аутентификация пользователя
  static async authenticate(email, password) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Получаем хешированный пароль из базы
      const userWithPassword = await database.get(`
        SELECT password FROM users WHERE email = ? AND is_active = 1
      `, [email]);

      if (!userWithPassword) {
        throw new Error('Пользователь не найден');
      }

      // Проверяем пароль
      const isValidPassword = await bcrypt.compare(password, userWithPassword.password);
      if (!isValidPassword) {
        throw new Error('Неверный пароль');
      }

      // Обновляем время последнего входа
      await database.run(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
      `, [user.id]);

      logger.info('✅ Пользователь аутентифицирован:', { id: user.id, email });
      return user;
    } catch (error) {
      logger.error('Ошибка аутентификации:', error);
      throw error;
    }
  }

  // Обновление пользователя
  async update(updateData) {
    try {
      const allowedFields = ['name', 'avatar', 'phone', 'address'];
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
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, values);

      logger.info('✅ Пользователь обновлен:', { id: this.id, updates });
      return await User.findById(this.id);
    } catch (error) {
      logger.error('Ошибка обновления пользователя:', error);
      throw error;
    }
  }

  // Изменение роли пользователя
  static async changeRole(userId, newRole) {
    try {
      if (!['user', 'admin'].includes(newRole)) {
        throw new Error('Неверная роль пользователя');
      }

      await database.run(`
        UPDATE users 
        SET role = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newRole, userId]);

      logger.info('✅ Роль пользователя изменена:', { userId, newRole });
      return await User.findById(userId);
    } catch (error) {
      logger.error('Ошибка изменения роли:', error);
      throw error;
    }
  }

  // Удаление пользователя (мягкое удаление)
  async delete() {
    try {
      await database.run(`
        UPDATE users 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [this.id]);

      logger.info('✅ Пользователь удален:', { id: this.id });
      return true;
    } catch (error) {
      logger.error('Ошибка удаления пользователя:', error);
      throw error;
    }
  }

  // Получение статистики пользователя
  async getStats() {
    try {
      const stats = await database.get(`
        SELECT 
          (SELECT COUNT(*) FROM chat_sessions WHERE user_id = ?) as sessions_count,
          (SELECT COUNT(*) FROM chat_messages WHERE user_id = ?) as messages_count,
          (SELECT COUNT(*) FROM documents WHERE user_id = ? AND is_deleted = 0) as documents_count,
          (SELECT COUNT(*) FROM audio_files WHERE user_id = ?) as audio_files_count
      `, [this.id, this.id, this.id, this.id]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики пользователя:', error);
      return null;
    }
  }

  // Проверка, является ли пользователь администратором
  isAdmin() {
    return this.role === 'admin';
  }

  // Получение профиля пользователя
  async getProfile() {
    try {
      const profile = await database.get(`
        SELECT * FROM user_profiles WHERE user_id = ?
      `, [this.id]);

      if (!profile) {
        return { personalData: {}, caseNotes: [], preferences: {} };
      }

      return {
        personalData: JSON.parse(profile.personal_data || '{}'),
        caseNotes: JSON.parse(profile.case_notes || '[]'),
        preferences: JSON.parse(profile.preferences || '{}')
      };
    } catch (error) {
      logger.error('Ошибка получения профиля:', error);
      return { personalData: {}, caseNotes: [], preferences: {} };
    }
  }

  // Обновление профиля пользователя
  async updateProfile(profileData) {
    try {
      const { personalData, caseNotes, preferences } = profileData;
      
      await database.run(`
        UPDATE user_profiles 
        SET personal_data = ?, case_notes = ?, preferences = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        JSON.stringify(personalData || {}),
        JSON.stringify(caseNotes || []),
        JSON.stringify(preferences || {}),
        this.id
      ]);

      logger.info('✅ Профиль пользователя обновлен:', { id: this.id });
      return await this.getProfile();
    } catch (error) {
      logger.error('Ошибка обновления профиля:', error);
      throw error;
    }
  }

  // Безопасное представление пользователя (без пароля)
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      avatar: this.avatar,
      phone: this.phone,
      address: this.address,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin,
      isActive: this.isActive
    };
  }
}

module.exports = User;
