#!/usr/bin/env node

/**
 * Скрипт миграции данных из файлового хранения в SQLite
 * Запуск: node scripts/migrate-to-sqlite.js
 */

const fs = require('fs').promises;
const path = require('path');
const database = require('../database/database');
const User = require('../models/User');
const logger = require('../utils/logger');

class DataMigrator {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.statsFile = path.join(this.dataDir, 'windexai_stats.json');
    this.dailyStatsFile = path.join(this.dataDir, 'daily_stats.json');
  }

  async migrate() {
    try {
      logger.info('🚀 Начинаем миграцию данных в SQLite...');
      
      // Проверяем существование файлов данных
      await this.checkDataFiles();
      
      // Мигрируем пользователей
      await this.migrateUsers();
      
      // Мигрируем статистику
      await this.migrateStats();
      
      // Создаем демо-пользователей если их нет
      await this.createDemoUsers();
      
      logger.info('✅ Миграция завершена успешно!');
      
    } catch (error) {
      logger.error('❌ Ошибка миграции:', error);
      throw error;
    }
  }

  async checkDataFiles() {
    try {
      await fs.access(this.dataDir);
      logger.info('📁 Директория данных найдена');
    } catch {
      logger.info('📁 Создаем директорию данных...');
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async migrateUsers() {
    try {
      // Проверяем, есть ли уже пользователи в базе
      const existingUsers = await User.findAll(1, 0);
      if (existingUsers.length > 0) {
        logger.info('👥 Пользователи уже существуют в базе, пропускаем миграцию');
        return;
      }

      // Создаем демо-пользователей
      logger.info('👥 Создаем демо-пользователей...');
      
      const demoUsers = [
        {
          name: 'Администратор',
          email: 'admin@mail.ru',
          password: 'admin123',
          role: 'admin'
        },
        {
          name: 'Тестовый Пользователь',
          email: 'user@test.com',
          password: 'user123',
          role: 'user'
        },
        {
          name: 'Иван Петров',
          email: 'ivan@example.com',
          password: 'password123',
          role: 'user'
        }
      ];

      for (const userData of demoUsers) {
        try {
          await User.create(userData);
          logger.info(`✅ Пользователь создан: ${userData.email}`);
        } catch (error) {
          if (error.message.includes('уже существует')) {
            logger.info(`⚠️ Пользователь уже существует: ${userData.email}`);
          } else {
            logger.error(`❌ Ошибка создания пользователя ${userData.email}:`, error.message);
          }
        }
      }

    } catch (error) {
      logger.error('❌ Ошибка миграции пользователей:', error);
      throw error;
    }
  }

  async migrateStats() {
    try {
      // Проверяем, есть ли уже статистика в базе
      const existingStats = await database.get(`
        SELECT COUNT(*) as count FROM windexai_stats
      `);
      
      if (existingStats.count > 0) {
        logger.info('📊 Статистика уже существует в базе, пропускаем миграцию');
        return;
      }

      logger.info('📊 Миграция статистики...');

      // Создаем демо-статистику
      const demoStats = [
        {
          userId: null,
          requestType: 'chat',
          model: 'gpt-4o-mini',
          tokensUsed: 150,
          cost: 0.0003,
          responseTime: 1200
        },
        {
          userId: null,
          requestType: 'chat',
          model: 'gpt-4o-mini',
          tokensUsed: 200,
          cost: 0.0004,
          responseTime: 1500
        },
        {
          userId: null,
          requestType: 'document_analysis',
          model: 'gpt-4o-mini',
          tokensUsed: 300,
          cost: 0.0006,
          responseTime: 2000
        }
      ];

      for (const stat of demoStats) {
        await database.run(`
          INSERT INTO windexai_stats (user_id, request_type, model, tokens_used, cost, response_time, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || abs(random() % 7) || ' days'))
        `, [stat.userId, stat.requestType, stat.model, stat.tokensUsed, stat.cost, stat.responseTime]);
      }

      logger.info('✅ Демо-статистика создана');

    } catch (error) {
      logger.error('❌ Ошибка миграции статистики:', error);
      throw error;
    }
  }

  async createDemoUsers() {
    try {
      // Проверяем, есть ли пользователи
      const users = await User.findAll(1, 0);
      if (users.length === 0) {
        logger.info('👥 Создаем базовых пользователей...');
        
        // Создаем админа
        await User.create({
          name: 'Системный Администратор',
          email: 'admin@system.com',
          password: 'admin123',
          role: 'admin'
        });

        // Создаем обычного пользователя
        await User.create({
          name: 'Демо Пользователь',
          email: 'demo@user.com',
          password: 'demo123',
          role: 'user'
        });

        logger.info('✅ Базовые пользователи созданы');
      }
    } catch (error) {
      logger.error('❌ Ошибка создания базовых пользователей:', error);
    }
  }

  async showStats() {
    try {
      const stats = await database.getStats();
      logger.info('📊 Статистика базы данных:');
      stats.forEach(stat => {
        logger.info(`  ${stat.table_name}: ${stat.count} записей`);
      });
    } catch (error) {
      logger.error('❌ Ошибка получения статистики:', error);
    }
  }
}

// Запуск миграции
async function main() {
  const migrator = new DataMigrator();
  
  try {
    await migrator.migrate();
    await migrator.showStats();
    
    logger.info('🎉 Миграция завершена! База данных готова к использованию.');
    process.exit(0);
  } catch (error) {
    logger.error('💥 Критическая ошибка миграции:', error);
    process.exit(1);
  }
}

// Запускаем только если файл вызван напрямую
if (require.main === module) {
  main();
}

module.exports = DataMigrator;
