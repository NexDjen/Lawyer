#!/usr/bin/env node

/**
 * Скрипт миграции JSON файлов в базу данных SQLite
 * Мигрирует все данные из JSON файлов в соответствующие таблицы БД
 */

const path = require('path');
const fs = require('fs');
const database = require('../database/database');
const logger = require('../utils/logger');

class JsonToDbMigrator {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.migrationResults = {
      analysis: { migrated: 0, errors: 0 },
      documents: { migrated: 0, errors: 0 },
      windexaiStats: { migrated: 0, errors: 0 },
      profiles: { migrated: 0, errors: 0 },
      dailyStats: { migrated: 0, errors: 0 }
    };
  }

  async migrate() {
    try {
      logger.info('🚀 Начинаем миграцию JSON файлов в базу данных...');
      
      // Создаем недостающие таблицы
      await this.createMissingTables();
      
      // Мигрируем каждый тип данных
      await this.migrateAnalysisJson();
      await this.migrateDocumentsJson();
      await this.migrateWindexaiStats();
      await this.migrateProfiles();
      await this.migrateDailyStats();
      
      // Выводим результаты
      this.printResults();
      
      logger.info('✅ Миграция завершена успешно!');
      
    } catch (error) {
      logger.error('❌ Ошибка при миграции:', error);
      throw error;
    }
  }

  async createMissingTables() {
    logger.info('📋 Создаем недостающие таблицы...');
    
    const additionalTables = [
      // Таблица для анализа документов
      `CREATE TABLE IF NOT EXISTS document_analysis (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        document_id TEXT,
        analysis_type TEXT NOT NULL,
        analysis_data TEXT NOT NULL, -- JSON с результатами анализа
        summary TEXT,
        risk_level TEXT,
        main_issues TEXT, -- JSON массив
        legal_errors TEXT, -- JSON массив
        recommendations TEXT, -- JSON массив
        compliance_status TEXT,
        expert_opinion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      )`,

      // Таблица дневной статистики
      `CREATE TABLE IF NOT EXISTS daily_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        total_requests INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        documents_processed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица агрегированной статистики API
      `CREATE TABLE IF NOT EXISTS api_usage_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0,
        total_requests INTEGER DEFAULT 0,
        avg_tokens_per_request REAL DEFAULT 0,
        avg_cost_per_request REAL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month)
      )`
    ];

    for (const table of additionalTables) {
      await database.run(table);
    }

    // Создаем индексы
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_document_analysis_user_id ON document_analysis(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_document_analysis_document_id ON document_analysis(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_document_analysis_created_at ON document_analysis(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_daily_statistics_date ON daily_statistics(date)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_stats_month ON api_usage_stats(month)'
    ];

    for (const index of indexes) {
      await database.run(index);
    }

    logger.info('✅ Недостающие таблицы созданы');
  }

  async migrateAnalysisJson() {
    const analysisFile = path.join(this.dataDir, 'analysis.json');
    
    if (!fs.existsSync(analysisFile)) {
      logger.info('📄 analysis.json не найден, пропускаем...');
      return;
    }

    try {
      const analysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
      const items = analysisData.items || [];

      logger.info(`📊 Мигрируем ${items.length} записей анализа...`);

      for (const item of items) {
        try {
          await database.run(`
            INSERT INTO document_analysis (
              id, user_id, document_id, analysis_type, analysis_data,
              summary, risk_level, main_issues, legal_errors, 
              recommendations, compliance_status, expert_opinion,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            item.id,
            item.userId || '1',
            item.metadata?.docId || null,
            'advanced_analysis',
            JSON.stringify(item.analysis),
            item.analysis?.summary?.documentType || null,
            item.analysis?.summary?.riskLevel || null,
            JSON.stringify(item.analysis?.summary?.mainIssues || []),
            JSON.stringify(item.analysis?.legalErrors || []),
            JSON.stringify(item.analysis?.recommendations || []),
            item.analysis?.compliance || null,
            item.analysis?.expertOpinion || null,
            item.metadata?.analyzedAt || new Date().toISOString(),
            new Date().toISOString()
          ]);

          this.migrationResults.analysis.migrated++;
        } catch (error) {
          logger.error(`Ошибка миграции анализа ${item.id}:`, error);
          this.migrationResults.analysis.errors++;
        }
      }

      logger.info(`✅ Анализы мигрированы: ${this.migrationResults.analysis.migrated} успешно, ${this.migrationResults.analysis.errors} ошибок`);

    } catch (error) {
      logger.error('Ошибка чтения analysis.json:', error);
    }
  }

  async migrateDocumentsJson() {
    const documentsFile = path.join(this.dataDir, 'documents.json');
    
    if (!fs.existsSync(documentsFile)) {
      logger.info('📄 documents.json не найден, пропускаем...');
      return;
    }

    try {
      const documentsData = JSON.parse(fs.readFileSync(documentsFile, 'utf8'));
      const items = documentsData.items || [];

      logger.info(`📄 Мигрируем ${items.length} документов...`);

      for (const item of items) {
        try {
          // Сначала создаем запись документа
          await database.run(`
            INSERT INTO documents (
              id, user_id, filename, original_name, file_path, file_size,
              mime_type, document_type, extracted_text, ocr_confidence,
              analysis_result, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            item.id,
            '1', // По умолчанию пользователь 1
            item.metadata?.fileName || 'document',
            item.metadata?.fileName || 'document',
            item.filePath || '/uploads/' + item.id,
            item.metadata?.fileSize || 0,
            item.metadata?.mimeType || 'application/octet-stream',
            item.documentType || 'unknown',
            item.recognizedText || item.extractedText || '',
            item.confidence || 0,
            JSON.stringify(item.analysis || {}),
            item.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);

          // Если есть OCR данные, создаем запись в ocr_results
          if (item.extractedData) {
            await database.run(`
              INSERT INTO ocr_results (
                id, document_id, extracted_data, confidence, processing_time, created_at
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
              `ocr_${item.id}`,
              item.id,
              JSON.stringify(item.extractedData),
              item.confidence || 0,
              item.processingTime || 0,
              item.createdAt || new Date().toISOString()
            ]);
          }

          this.migrationResults.documents.migrated++;
        } catch (error) {
          logger.error(`Ошибка миграции документа ${item.id}:`, error);
          this.migrationResults.documents.errors++;
        }
      }

      logger.info(`✅ Документы мигрированы: ${this.migrationResults.documents.migrated} успешно, ${this.migrationResults.documents.errors} ошибок`);

    } catch (error) {
      logger.error('Ошибка чтения documents.json:', error);
    }
  }

  async migrateWindexaiStats() {
    const statsFile = path.join(this.dataDir, 'windexai_stats.json');
    
    if (!fs.existsSync(statsFile)) {
      logger.info('📄 windexai_stats.json не найден, пропускаем...');
      return;
    }

    try {
      const statsData = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
      
      logger.info('📊 Мигрируем статистику WindexAI...');

      // Создаем агрегированную запись
      await database.run(`
        INSERT OR REPLACE INTO api_usage_stats (
          month, total_tokens, total_cost, total_requests,
          avg_tokens_per_request, avg_cost_per_request, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        statsData.currentMonth || new Date().toISOString().slice(0, 7),
        statsData.totalTokens || 0,
        statsData.totalCost || 0,
        statsData.totalRequests || 0,
        statsData.avgTokensPerRequest || 0,
        statsData.avgCostPerRequest || 0,
        statsData.lastUpdated || new Date().toISOString()
      ]);

      this.migrationResults.windexaiStats.migrated = 1;
      logger.info('✅ Статистика WindexAI мигрирована');

    } catch (error) {
      logger.error('Ошибка миграции windexai_stats.json:', error);
      this.migrationResults.windexaiStats.errors++;
    }
  }

  async migrateProfiles() {
    const profilesDir = path.join(this.dataDir, 'profiles');
    
    if (!fs.existsSync(profilesDir)) {
      logger.info('📁 Папка profiles не найдена, пропускаем...');
      return;
    }

    try {
      const profileFiles = fs.readdirSync(profilesDir).filter(file => file.endsWith('.json'));
      
      logger.info(`👤 Мигрируем ${profileFiles.length} профилей...`);

      for (const file of profileFiles) {
        try {
          const profilePath = path.join(profilesDir, file);
          const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          const userId = file.replace('.json', '');

          await database.run(`
            INSERT OR REPLACE INTO user_profiles (
              id, user_id, personal_data, case_notes, preferences,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            `profile_${userId}`,
            userId,
            JSON.stringify(profileData.personalData || {}),
            JSON.stringify(profileData.caseNotes || []),
            JSON.stringify(profileData.preferences || {}),
            profileData.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]);

          this.migrationResults.profiles.migrated++;
        } catch (error) {
          logger.error(`Ошибка миграции профиля ${file}:`, error);
          this.migrationResults.profiles.errors++;
        }
      }

      logger.info(`✅ Профили мигрированы: ${this.migrationResults.profiles.migrated} успешно, ${this.migrationResults.profiles.errors} ошибок`);

    } catch (error) {
      logger.error('Ошибка миграции профилей:', error);
    }
  }

  async migrateDailyStats() {
    const dailyStatsFile = path.join(this.dataDir, 'daily_stats.json');
    
    if (!fs.existsSync(dailyStatsFile)) {
      logger.info('📄 daily_stats.json не найден, пропускаем...');
      return;
    }

    try {
      const dailyStatsData = JSON.parse(fs.readFileSync(dailyStatsFile, 'utf8'));
      
      logger.info('📅 Мигрируем дневную статистику...');

      for (const [date, stats] of Object.entries(dailyStatsData)) {
        try {
          await database.run(`
            INSERT OR REPLACE INTO daily_statistics (
              date, total_requests, total_tokens, total_cost,
              active_users, documents_processed, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            date,
            stats.totalRequests || 0,
            stats.totalTokens || 0,
            stats.totalCost || 0,
            stats.activeUsers || 0,
            stats.documentsProcessed || 0,
            new Date().toISOString(),
            new Date().toISOString()
          ]);

          this.migrationResults.dailyStats.migrated++;
        } catch (error) {
          logger.error(`Ошибка миграции дневной статистики ${date}:`, error);
          this.migrationResults.dailyStats.errors++;
        }
      }

      logger.info(`✅ Дневная статистика мигрирована: ${this.migrationResults.dailyStats.migrated} записей`);

    } catch (error) {
      logger.error('Ошибка миграции daily_stats.json:', error);
    }
  }

  printResults() {
    console.log('\n📊 РЕЗУЛЬТАТЫ МИГРАЦИИ:');
    console.log('========================');
    console.log(`📄 Анализы: ${this.migrationResults.analysis.migrated} мигрированы, ${this.migrationResults.analysis.errors} ошибок`);
    console.log(`📄 Документы: ${this.migrationResults.documents.migrated} мигрированы, ${this.migrationResults.documents.errors} ошибок`);
    console.log(`📊 Статистика WindexAI: ${this.migrationResults.windexaiStats.migrated} мигрирована, ${this.migrationResults.windexaiStats.errors} ошибок`);
    console.log(`👤 Профили: ${this.migrationResults.profiles.migrated} мигрированы, ${this.migrationResults.profiles.errors} ошибок`);
    console.log(`📅 Дневная статистика: ${this.migrationResults.dailyStats.migrated} мигрирована, ${this.migrationResults.dailyStats.errors} ошибок`);
    
    const totalMigrated = Object.values(this.migrationResults).reduce((sum, result) => sum + result.migrated, 0);
    const totalErrors = Object.values(this.migrationResults).reduce((sum, result) => sum + result.errors, 0);
    
    console.log(`\n🎯 ИТОГО: ${totalMigrated} записей мигрировано, ${totalErrors} ошибок`);
  }
}

// Запуск миграции
if (require.main === module) {
  const migrator = new JsonToDbMigrator();
  migrator.migrate()
    .then(() => {
      console.log('✅ Миграция завершена успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка миграции:', error);
      process.exit(1);
    });
}

module.exports = JsonToDbMigrator;

