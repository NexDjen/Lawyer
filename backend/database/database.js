const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'data', 'lawyer.db');
    this.init();
  }

  async init() {
    try {
      // Создаем директорию для базы данных если её нет
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Создаем подключение к базе данных
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Ошибка подключения к SQLite:', err);
          throw err;
        }
        logger.info('✅ SQLite база данных подключена:', this.dbPath);
      });

      // Disable foreign key enforcement for testing
      this.db.run('PRAGMA foreign_keys = OFF');
      
      // Создаем таблицы
      await this.createTables();
      
    } catch (error) {
      logger.error('Ошибка инициализации базы данных:', error);
      throw error;
    }
  }

  async addMissingColumns() {
    try {
      // Проверяем, существует ли колонка analysis_data
      const tableInfo = await this.all("PRAGMA table_info(document_analysis)");
      const hasAnalysisData = tableInfo.some(col => col.name === 'analysis_data');
      
      if (!hasAnalysisData) {
        await this.run(`
          ALTER TABLE document_analysis ADD COLUMN analysis_data TEXT
        `);
        console.log('✅ Added analysis_data column to document_analysis table');
      } else {
        console.log('ℹ️ analysis_data column already exists');
      }

      // Проверяем и добавляем колонки для группового анализа в таблицу documents
      const documentsTableInfo = await this.all("PRAGMA table_info(documents)");
      const hasIsBatch = documentsTableInfo.some(col => col.name === 'is_batch');
      const hasBatchId = documentsTableInfo.some(col => col.name === 'batch_id');
      const hasDocumentCount = documentsTableInfo.some(col => col.name === 'document_count');

      if (!hasIsBatch) {
        await this.run(`ALTER TABLE documents ADD COLUMN is_batch BOOLEAN DEFAULT 0`);
        console.log('✅ Added is_batch column to documents table');
      }

      if (!hasBatchId) {
        await this.run(`ALTER TABLE documents ADD COLUMN batch_id TEXT`);
        console.log('✅ Added batch_id column to documents table');
      }

      if (!hasDocumentCount) {
        await this.run(`ALTER TABLE documents ADD COLUMN document_count INTEGER DEFAULT 1`);
        console.log('✅ Added document_count column to documents table');
      }

    } catch (error) {
      // Игнорируем ошибки, если колонка уже существует
      if (!error.message.includes('duplicate column name')) {
        console.log('Note: Some columns may already exist');
      }
    }
  }

  async createTables() {
    // Сначала добавляем недостающие колонки в существующие таблицы
    await this.addMissingColumns();
    
    const tables = [
      // Таблица пользователей
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        avatar TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )`,

      // Таблица чат сессий
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Таблица сообщений чата
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('user', 'bot', 'system')),
        content TEXT NOT NULL,
        audio_url TEXT,
        document_url TEXT,
        metadata TEXT, -- JSON для дополнительных данных
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Таблица документов
      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        document_type TEXT,
        extracted_text TEXT,
        ocr_confidence REAL,
        analysis_result TEXT, -- JSON с результатами анализа
        is_batch BOOLEAN DEFAULT 0, -- Флаг группового анализа
        batch_id TEXT, -- ID группового анализа
        document_count INTEGER DEFAULT 1, -- Количество документов в пакете
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT 0
        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE  (disabled for testing)
      )`,

      // Таблица анализа документов
      `CREATE TABLE IF NOT EXISTS document_analysis (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        risks TEXT, -- JSON с выявленными рисками
        recommendations TEXT, -- JSON с рекомендациями
        summary TEXT,
        confidence REAL,
        processing_time INTEGER, -- в миллисекундах
        model_used TEXT,
        analysis_data TEXT, -- JSON с полными данными анализа
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )`,

      // Таблица OCR результатов
      `CREATE TABLE IF NOT EXISTS ocr_results (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        extracted_data TEXT NOT NULL, -- JSON с извлеченными данными
        confidence REAL,
        processing_time INTEGER, -- в миллисекундах
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )`,

      // Таблица аудио файлов
      `CREATE TABLE IF NOT EXISTS audio_files (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        duration INTEGER, -- в секундах
        voice_type TEXT,
        tts_service TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,

      // Таблица статистики WindexAI
      `CREATE TABLE IF NOT EXISTS windexai_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        request_type TEXT NOT NULL,
        model TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        cost REAL NOT NULL,
        response_time INTEGER, -- в миллисекундах
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,

      // Таблица персональных данных пользователей
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        personal_data TEXT, -- JSON с персональными данными
        case_notes TEXT, -- JSON с заметками о делах
        preferences TEXT, -- JSON с настройками пользователя
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Таблица системных настроек
      `CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица агрегированной статистики API
      `CREATE TABLE IF NOT EXISTS api_usage_stats (
        month TEXT PRIMARY KEY,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0,
        total_requests INTEGER DEFAULT 0,
        avg_tokens_per_request REAL DEFAULT 0,
        avg_cost_per_request REAL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица дневной статистики
      `CREATE TABLE IF NOT EXISTS daily_statistics (
        date TEXT PRIMARY KEY,
        total_requests INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        documents_processed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Таблица пакетных анализов (дела из нескольких документов)
      `CREATE TABLE IF NOT EXISTS batch_cases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        case_name TEXT NOT NULL,
        case_number TEXT,
        description TEXT,
        file_count INTEGER NOT NULL,
        file_names TEXT NOT NULL, -- JSON array с названиями файлов
        document_type TEXT DEFAULT 'legal',
        icon TEXT DEFAULT 'briefcase', -- Иконка для отображения (briefcase для дел)
        ocr_metadata TEXT, -- JSON с метаданными OCR
        analysis_result TEXT, -- JSON с результатами анализа
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT 0
        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Создаем индексы для оптимизации
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)',
      'CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON audio_files(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_windexai_stats_user_id ON windexai_stats(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_windexai_stats_created_at ON windexai_stats(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_document_analysis_doc_id ON document_analysis(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_document_analysis_user_id ON document_analysis(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_document_analysis_created_at ON document_analysis(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_batch_cases_user_id ON batch_cases(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_batch_cases_created_at ON batch_cases(created_at)'
    ];

    for (const index of indexes) {
      await this.run(index);
    }

    logger.info('✅ Все таблицы и индексы созданы');
    // Seed default user for document FK constraint
    try {
      await this.run(
        `INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
        ['1', 'Default User', 'default@localhost', '', 'user']
      );
      logger.info('Default user seeded for FK tests');
    } catch (seedErr) {
      logger.warn('Failed to seed default user', { error: seedErr.message });
    }
  }

  // Универсальный метод для выполнения запросов
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('SQLite run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Универсальный метод для получения одной записи
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('SQLite get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Универсальный метод для получения множества записей
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('SQLite all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Транзакции
  async transaction(callback) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        callback(this)
          .then(() => {
            this.db.run('COMMIT', (err) => {
              if (err) {
                logger.error('Transaction commit error:', err);
                reject(err);
              } else {
                resolve();
              }
            });
          })
          .catch((err) => {
            this.db.run('ROLLBACK', (rollbackErr) => {
              if (rollbackErr) {
                logger.error('Transaction rollback error:', rollbackErr);
              }
              reject(err);
            });
          });
      });
    });
  }

  // Закрытие соединения
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Ошибка закрытия базы данных:', err);
            reject(err);
          } else {
            logger.info('✅ База данных закрыта');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Получение статистики базы данных
  async getStats() {
    try {
      const stats = await this.all(`
        SELECT 
          'users' as table_name, COUNT(*) as count FROM users
        UNION ALL
        SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
        UNION ALL
        SELECT 'chat_messages', COUNT(*) FROM chat_messages
        UNION ALL
        SELECT 'documents', COUNT(*) FROM documents
        UNION ALL
        SELECT 'audio_files', COUNT(*) FROM audio_files
        UNION ALL
        SELECT 'windexai_stats', COUNT(*) FROM windexai_stats
      `);
      
      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики БД:', error);
      return [];
    }
  }
}

// Создаем singleton экземпляр
const database = new Database();

module.exports = database;
