/**
 * Сервис для работы со статистикой API в базе данных
 * Заменяет работу с windexai_stats.json и daily_stats.json файлами
 */

const database = require('../database/database');
const logger = require('../utils/logger');

class ApiStatsService {
  /**
   * Обновить статистику использования API
   */
  async updateApiStats(userId, requestType, model, tokensUsed, cost, responseTime) {
    try {
      await database.run(`
        INSERT INTO windexai_stats (
          user_id, request_type, model, tokens_used, cost, response_time, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, requestType, model, tokensUsed, cost, responseTime, new Date().toISOString()]);

      // Обновляем агрегированную статистику
      await this.updateAggregatedStats();

      logger.info('Статистика API обновлена в БД', { userId, tokensUsed, cost });
    } catch (error) {
      logger.error('Ошибка обновления статистики API в БД:', error);
      throw error;
    }
  }

  /**
   * Обновить агрегированную статистику
   */
  async updateAggregatedStats() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Получаем статистику за текущий месяц
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(tokens_used) as total_tokens,
          SUM(cost) as total_cost,
          AVG(tokens_used) as avg_tokens_per_request,
          AVG(cost) as avg_cost_per_request
        FROM windexai_stats 
        WHERE strftime('%Y-%m', created_at) = ?
      `, [currentMonth]);

      // Обновляем или создаем запись за месяц
      await database.run(`
        INSERT OR REPLACE INTO api_usage_stats (
          month, total_tokens, total_cost, total_requests,
          avg_tokens_per_request, avg_cost_per_request, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        currentMonth,
        stats.total_tokens || 0,
        stats.total_cost || 0,
        stats.total_requests || 0,
        stats.avg_tokens_per_request || 0,
        stats.avg_cost_per_request || 0,
        new Date().toISOString()
      ]);

      logger.info('Агрегированная статистика обновлена', { currentMonth });
    } catch (error) {
      logger.error('Ошибка обновления агрегированной статистики:', error);
    }
  }

  /**
   * Получить общую статистику API
   */
  async getApiStats() {
    try {
      const stats = await database.get(`
        SELECT 
          SUM(total_tokens) as totalTokens,
          SUM(total_cost) as totalCost,
          SUM(total_requests) as totalRequests,
          AVG(avg_tokens_per_request) as avgTokensPerRequest,
          AVG(avg_cost_per_request) as avgCostPerRequest,
          MAX(last_updated) as lastUpdated
        FROM api_usage_stats
      `);

      const currentMonth = new Date().toISOString().slice(0, 7);
      
      return {
        totalTokens: stats.totalTokens || 0,
        totalCost: stats.totalCost || 0,
        totalRequests: stats.totalRequests || 0,
        avgTokensPerRequest: stats.avgTokensPerRequest || 0,
        avgCostPerRequest: stats.avgCostPerRequest || 0,
        currentMonth,
        lastUpdated: stats.lastUpdated || new Date().toISOString()
      };
    } catch (error) {
      logger.error('Ошибка получения статистики API из БД:', error);
      throw error;
    }
  }

  /**
   * Обновить дневную статистику
   */
  async updateDailyStats(date, stats) {
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

      logger.info('Дневная статистика обновлена в БД', { date, stats });
    } catch (error) {
      logger.error('Ошибка обновления дневной статистики в БД:', error);
      throw error;
    }
  }

  /**
   * Получить дневную статистику
   */
  async getDailyStats(date) {
    try {
      const stats = await database.get(`
        SELECT * FROM daily_statistics WHERE date = ?
      `, [date]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения дневной статистики из БД:', error);
      throw error;
    }
  }

  /**
   * Получить статистику за период
   */
  async getStatsForPeriod(startDate, endDate) {
    try {
      const stats = await database.all(`
        SELECT * FROM daily_statistics 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date ASC
      `, [startDate, endDate]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики за период из БД:', error);
      throw error;
    }
  }

  /**
   * Получить статистику пользователя
   */
  async getUserStats(userId, startDate, endDate) {
    try {
      const stats = await database.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as requests,
          SUM(tokens_used) as tokens,
          SUM(cost) as cost
        FROM windexai_stats 
        WHERE user_id = ? 
        AND DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [userId, startDate, endDate]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики пользователя из БД:', error);
      throw error;
    }
  }

  /**
   * Очистить старую статистику (старше N дней)
   */
  async cleanupOldStats(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      await database.run(`
        DELETE FROM windexai_stats 
        WHERE created_at < ?
      `, [cutoffDate.toISOString()]);

      logger.info('Старая статистика очищена', { cutoffDate: cutoffDate.toISOString() });
    } catch (error) {
      logger.error('Ошибка очистки старой статистики:', error);
      throw error;
    }
  }
}

module.exports = new ApiStatsService();

