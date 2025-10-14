const database = require('../database/database');
const logger = require('../utils/logger');

class WindexAIStats {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.requestType = data.request_type;
    this.model = data.model;
    this.tokensUsed = data.tokens_used;
    this.cost = data.cost;
    this.responseTime = data.response_time;
    this.createdAt = data.created_at;
  }

  // Запись статистики использования
  static async record(statsData) {
    try {
      const {
        userId = null,
        requestType = 'chat',
        model = 'gpt-4o-mini',
        tokensUsed = 0,
        cost = 0,
        responseTime = null
      } = statsData;

      await database.run(`
        INSERT INTO windexai_stats (user_id, request_type, model, tokens_used, cost, response_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, requestType, model, tokensUsed, cost, responseTime]);

      logger.info('✅ Статистика WindexAI записана:', { 
        userId, requestType, model, tokensUsed, cost 
      });
    } catch (error) {
      logger.error('Ошибка записи статистики WindexAI:', error);
      throw error;
    }
  }

  // Получение общей статистики
  static async getOverallStats() {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost,
          AVG(tokens_used) as avg_tokens_per_request,
          AVG(cost) as avg_cost_per_request,
          AVG(response_time) as avg_response_time,
          MIN(created_at) as first_request,
          MAX(created_at) as last_request
        FROM windexai_stats
      `);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения общей статистики:', error);
      return null;
    }
  }

  // Получение статистики по пользователю
  static async getUserStats(userId) {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost,
          AVG(tokens_used) as avg_tokens_per_request,
          AVG(cost) as avg_cost_per_request,
          AVG(response_time) as avg_response_time,
          MIN(created_at) as first_request,
          MAX(created_at) as last_request
        FROM windexai_stats
        WHERE user_id = ?
      `, [userId]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики пользователя:', error);
      return null;
    }
  }

  // Получение статистики по дням
  static async getDailyStats(days = 30) {
    try {
      const stats = await database.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as requests,
          SUM(tokens_used) as tokens,
          SUM(cost) as cost,
          AVG(response_time) as avg_response_time
        FROM windexai_stats
        WHERE created_at >= DATE('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения дневной статистики:', error);
      return [];
    }
  }

  // Получение статистики по моделям
  static async getModelStats() {
    try {
      const stats = await database.all(`
        SELECT 
          model,
          COUNT(*) as requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost,
          AVG(tokens_used) as avg_tokens,
          AVG(cost) as avg_cost
        FROM windexai_stats
        GROUP BY model
        ORDER BY total_cost DESC
      `);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики по моделям:', error);
      return [];
    }
  }

  // Получение статистики по типам запросов
  static async getRequestTypeStats() {
    try {
      const stats = await database.all(`
        SELECT 
          request_type,
          COUNT(*) as requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost,
          AVG(tokens_used) as avg_tokens,
          AVG(cost) as avg_cost
        FROM windexai_stats
        GROUP BY request_type
        ORDER BY total_cost DESC
      `);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики по типам запросов:', error);
      return [];
    }
  }

  // Получение топ пользователей по использованию
  static async getTopUsers(limit = 10) {
    try {
      const stats = await database.all(`
        SELECT 
          user_id,
          COUNT(*) as requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost
        FROM windexai_stats
        WHERE user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY total_cost DESC
        LIMIT ?
      `, [limit]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения топ пользователей:', error);
      return [];
    }
  }

  // Получение статистики за текущий месяц
  static async getCurrentMonthStats() {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost,
          AVG(tokens_used) as avg_tokens_per_request,
          AVG(cost) as avg_cost_per_request
        FROM windexai_stats
        WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики за месяц:', error);
      return null;
    }
  }

  // Получение статистики за последние N часов
  static async getRecentStats(hours = 24) {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost,
          AVG(response_time) as avg_response_time
        FROM windexai_stats
        WHERE created_at >= datetime('now', '-${hours} hours')
      `);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения недавней статистики:', error);
      return null;
    }
  }

  // Очистка старых записей
  static async cleanupOldRecords(daysToKeep = 90) {
    try {
      const result = await database.run(`
        DELETE FROM windexai_stats 
        WHERE created_at < datetime('now', '-${daysToKeep} days')
      `);

      logger.info('✅ Старые записи статистики очищены:', { 
        deletedCount: result.changes,
        daysToKeep 
      });
      
      return result.changes;
    } catch (error) {
      logger.error('Ошибка очистки старых записей:', error);
      throw error;
    }
  }

  // Получение прогноза расходов
  static async getCostForecast(days = 30) {
    try {
      const currentMonth = await this.getCurrentMonthStats();
      if (!currentMonth || currentMonth.requests === 0) {
        return { forecast: 0, confidence: 'low' };
      }

      const dailyAverage = currentMonth.total_cost / new Date().getDate();
      const forecast = dailyAverage * days;
      
      let confidence = 'medium';
      if (currentMonth.requests < 10) confidence = 'low';
      if (currentMonth.requests > 100) confidence = 'high';

      return {
        forecast: Math.round(forecast * 100) / 100,
        dailyAverage: Math.round(dailyAverage * 100) / 100,
        confidence,
        basedOnRequests: currentMonth.requests
      };
    } catch (error) {
      logger.error('Ошибка получения прогноза расходов:', error);
      return { forecast: 0, confidence: 'low' };
    }
  }

  // Получение детальной статистики для админ-панели
  static async getAdminStats() {
    try {
      const [
        overall,
        daily,
        models,
        requestTypes,
        topUsers,
        currentMonth,
        recent
      ] = await Promise.all([
        this.getOverallStats(),
        this.getDailyStats(30),
        this.getModelStats(),
        this.getRequestTypeStats(),
        this.getTopUsers(10),
        this.getCurrentMonthStats(),
        this.getRecentStats(24)
      ]);

      return {
        overall,
        daily,
        models,
        requestTypes,
        topUsers,
        currentMonth,
        recent,
        forecast: await this.getCostForecast(30)
      };
    } catch (error) {
      logger.error('Ошибка получения админ статистики:', error);
      return null;
    }
  }

  // Экспорт статистики в CSV формат
  static async exportToCSV(startDate, endDate) {
    try {
      const records = await database.all(`
        SELECT 
          created_at,
          user_id,
          request_type,
          model,
          tokens_used,
          cost,
          response_time
        FROM windexai_stats
        WHERE created_at BETWEEN ? AND ?
        ORDER BY created_at DESC
      `, [startDate, endDate]);

      // Формируем CSV заголовки
      const headers = [
        'Date', 'User ID', 'Request Type', 'Model', 
        'Tokens Used', 'Cost', 'Response Time (ms)'
      ];

      // Формируем CSV строки
      const rows = records.map(record => [
        record.created_at,
        record.user_id || '',
        record.request_type,
        record.model,
        record.tokens_used,
        record.cost,
        record.response_time || ''
      ]);

      return [headers, ...rows];
    } catch (error) {
      logger.error('Ошибка экспорта статистики:', error);
      throw error;
    }
  }
}

module.exports = WindexAIStats;
