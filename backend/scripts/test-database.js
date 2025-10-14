#!/usr/bin/env node

/**
 * Скрипт тестирования SQLite базы данных
 * Запуск: node scripts/test-database.js
 */

const database = require('../database/database');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const Document = require('../models/Document');
const WindexAIStats = require('../models/WindexAIStats');
const logger = require('../utils/logger');

class DatabaseTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTests() {
    logger.info('🧪 Начинаем тестирование SQLite базы данных...');
    
    try {
      // Тест 1: Подключение к базе данных
      await this.testDatabaseConnection();
      
      // Тест 2: Создание пользователя
      await this.testUserCreation();
      
      // Тест 3: Аутентификация пользователя
      await this.testUserAuthentication();
      
      // Тест 4: Создание сессии чата
      await this.testChatSessionCreation();
      
      // Тест 5: Добавление сообщений
      await this.testMessageHandling();
      
      // Тест 6: Создание документа
      await this.testDocumentCreation();
      
      // Тест 7: Статистика WindexAI
      await this.testWindexAIStats();
      
      // Тест 8: Профиль пользователя
      await this.testUserProfile();
      
      // Тест 9: Транзакции
      await this.testTransactions();
      
      // Тест 10: Производительность
      await this.testPerformance();
      
      // Показать результаты
      this.showResults();
      
    } catch (error) {
      logger.error('❌ Критическая ошибка тестирования:', error);
      throw error;
    }
  }

  async testDatabaseConnection() {
    try {
      const stats = await database.getStats();
      this.addTestResult('Подключение к БД', true, `Найдено ${stats.length} таблиц`);
    } catch (error) {
      this.addTestResult('Подключение к БД', false, error.message);
    }
  }

  async testUserCreation() {
    try {
      const testUser = await User.create({
        name: 'Тестовый Пользователь',
        email: 'test@example.com',
        password: 'testpassword123',
        role: 'user'
      });
      
      this.addTestResult('Создание пользователя', true, `Пользователь создан: ${testUser.id}`);
      return testUser;
    } catch (error) {
      this.addTestResult('Создание пользователя', false, error.message);
      return null;
    }
  }

  async testUserAuthentication() {
    try {
      const user = await User.authenticate('test@example.com', 'testpassword123');
      this.addTestResult('Аутентификация пользователя', true, `Пользователь найден: ${user.name}`);
      return user;
    } catch (error) {
      this.addTestResult('Аутентификация пользователя', false, error.message);
      return null;
    }
  }

  async testChatSessionCreation() {
    try {
      const user = await User.findByEmail('test@example.com');
      if (!user) {
        this.addTestResult('Создание сессии чата', false, 'Пользователь не найден');
        return null;
      }

      const session = await ChatSession.create(user.id, 'Тестовая сессия');
      this.addTestResult('Создание сессии чата', true, `Сессия создана: ${session.id}`);
      return session;
    } catch (error) {
      this.addTestResult('Создание сессии чата', false, error.message);
      return null;
    }
  }

  async testMessageHandling() {
    try {
      const user = await User.findByEmail('test@example.com');
      const sessions = await ChatSession.findByUserId(user.id, 1);
      
      if (sessions.length === 0) {
        this.addTestResult('Обработка сообщений', false, 'Сессия не найдена');
        return;
      }

      const session = sessions[0];
      
      // Добавляем тестовые сообщения
      await session.addMessage({
        type: 'user',
        content: 'Привет, это тестовое сообщение!'
      });

      await session.addMessage({
        type: 'bot',
        content: 'Привет! Я готов помочь вам с юридическими вопросами.'
      });

      const messages = await session.getMessages();
      this.addTestResult('Обработка сообщений', true, `Добавлено ${messages.length} сообщений`);
    } catch (error) {
      this.addTestResult('Обработка сообщений', false, error.message);
    }
  }

  async testDocumentCreation() {
    try {
      const user = await User.findByEmail('test@example.com');
      
      const document = await Document.create({
        userId: user.id,
        filename: 'test-document.pdf',
        originalName: 'Тестовый документ.pdf',
        filePath: '/uploads/test-document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        documentType: 'contract',
        extractedText: 'Это тестовый текст документа',
        ocrConfidence: 0.95
      });

      this.addTestResult('Создание документа', true, `Документ создан: ${document.id}`);
      return document;
    } catch (error) {
      this.addTestResult('Создание документа', false, error.message);
      return null;
    }
  }

  async testWindexAIStats() {
    try {
      const user = await User.findByEmail('test@example.com');
      
      // Добавляем тестовую статистику
      await WindexAIStats.record({
        userId: user.id,
        requestType: 'chat',
        model: 'gpt-4o-mini',
        tokensUsed: 150,
        cost: 0.0003,
        responseTime: 1200
      });

      const stats = await WindexAIStats.getOverallStats();
      this.addTestResult('Статистика WindexAI', true, `Записей: ${stats.total_requests}, Токенов: ${stats.total_tokens}`);
    } catch (error) {
      this.addTestResult('Статистика WindexAI', false, error.message);
    }
  }

  async testUserProfile() {
    try {
      const user = await User.findByEmail('test@example.com');
      
      // Обновляем профиль
      await user.updateProfile({
        personalData: {
          fullName: 'Тестовый Пользователь',
          phone: '+7 (999) 123-45-67',
          address: 'г. Москва, ул. Тестовая, д. 1'
        },
        caseNotes: [
          {
            id: 'note_1',
            content: 'Тестовая заметка о деле',
            importance: 7,
            tags: ['тест', 'документы'],
            createdAt: new Date().toISOString()
          }
        ],
        preferences: {
          language: 'ru',
          notifications: true
        }
      });

      const profile = await user.getProfile();
      this.addTestResult('Профиль пользователя', true, `Профиль обновлен, заметок: ${profile.caseNotes.length}`);
    } catch (error) {
      this.addTestResult('Профиль пользователя', false, error.message);
    }
  }

  async testTransactions() {
    try {
      await database.transaction(async (db) => {
        // Создаем пользователя в транзакции
        const user = await User.create({
          name: 'Транзакционный Пользователь',
          email: 'transaction@example.com',
          password: 'transaction123',
          role: 'user'
        });

        // Создаем сессию
        const session = await ChatSession.create(user.id, 'Транзакционная сессия');
        
        // Добавляем сообщение
        await session.addMessage({
          type: 'user',
          content: 'Сообщение в транзакции'
        });
      });

      this.addTestResult('Транзакции', true, 'Транзакция выполнена успешно');
    } catch (error) {
      this.addTestResult('Транзакции', false, error.message);
    }
  }

  async testPerformance() {
    try {
      const startTime = Date.now();
      
      // Создаем 100 записей статистики
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(WindexAIStats.record({
          userId: null,
          requestType: 'performance_test',
          model: 'gpt-4o-mini',
          tokensUsed: Math.floor(Math.random() * 1000),
          cost: Math.random() * 0.01,
          responseTime: Math.floor(Math.random() * 5000)
        }));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.addTestResult('Производительность', true, `100 записей за ${duration}ms (${(1000/duration*100).toFixed(0)} записей/сек)`);
    } catch (error) {
      this.addTestResult('Производительность', false, error.message);
    }
  }

  addTestResult(testName, passed, message) {
    this.testResults.tests.push({
      name: testName,
      passed,
      message
    });
    
    if (passed) {
      this.testResults.passed++;
      logger.info(`✅ ${testName}: ${message}`);
    } else {
      this.testResults.failed++;
      logger.error(`❌ ${testName}: ${message}`);
    }
  }

  showResults() {
    logger.info('\n📊 Результаты тестирования:');
    logger.info(`✅ Пройдено: ${this.testResults.passed}`);
    logger.info(`❌ Провалено: ${this.testResults.failed}`);
    logger.info(`📈 Успешность: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      logger.info('\n❌ Проваленные тесты:');
      this.testResults.tests
        .filter(test => !test.passed)
        .forEach(test => logger.info(`  - ${test.name}: ${test.message}`));
    }
    
    if (this.testResults.passed === this.testResults.tests.length) {
      logger.info('\n🎉 Все тесты пройдены! База данных работает корректно.');
    } else {
      logger.warn('\n⚠️ Некоторые тесты провалены. Проверьте конфигурацию.');
    }
  }

  async cleanup() {
    try {
      // Удаляем тестовые данные
      await database.run('DELETE FROM windexai_stats WHERE request_type = ?', ['performance_test']);
      await database.run('DELETE FROM users WHERE email LIKE ?', ['%example.com']);
      logger.info('🧹 Тестовые данные очищены');
    } catch (error) {
      logger.warn('Ошибка очистки тестовых данных:', error.message);
    }
  }
}

// Запуск тестирования
async function main() {
  const tester = new DatabaseTester();
  
  try {
    await tester.runTests();
    await tester.cleanup();
    
    if (tester.testResults.failed === 0) {
      logger.info('🎉 Тестирование завершено успешно!');
      process.exit(0);
    } else {
      logger.warn('⚠️ Тестирование завершено с ошибками.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('💥 Критическая ошибка тестирования:', error);
    process.exit(1);
  }
}

// Запускаем только если файл вызван напрямую
if (require.main === module) {
  main();
}

module.exports = DatabaseTester;
