/**
 * Сервис для работы с анализами документов в базе данных
 * Заменяет работу с analysis.json файлом
 */

const database = require('../database/database');
const logger = require('../utils/logger');

class AnalysisService {
  /**
   * Сохранить анализ документа
   */
  async saveAnalysis(userId, documentId, analysisData) {
    try {
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      
      // Безопасная обработка данных анализа
      const analysis = analysisData.analysis || analysisData;
      const summary = analysis.summary || {};
      const risks = Array.isArray(analysis.risks) 
        ? analysis.risks 
        : Array.isArray(summary.mainIssues) 
          ? summary.mainIssues 
          : [];
      const recommendations = Array.isArray(analysis.recommendations) 
        ? analysis.recommendations 
        : [];
      
      logger.info('🔍 AnalysisService - saving analysis:', {
        analysisId,
        userId,
        documentId,
        risksCount: risks.length,
        recommendationsCount: recommendations.length,
        recommendations: recommendations
      });
      
      await database.run(`
        INSERT INTO document_analysis (
          id, user_id, document_id, analysis_type, risks,
          recommendations, summary, confidence, model_used,
          analysis_data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        analysisId,
        userId,
        documentId,
        'advanced_analysis',
        JSON.stringify(risks),
        JSON.stringify(recommendations),
        summary.documentType || 'unknown',
        analysisData.confidence || 0.85,
        analysisData.modelUsed || 'gpt-4o',
        JSON.stringify(analysis), // Сохраняем полные данные анализа
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      logger.info('Анализ сохранен в БД', { analysisId, userId, documentId, risksCount: risks.length });
      return analysisId;
    } catch (error) {
      logger.error('Ошибка сохранения анализа в БД:', error);
      throw error;
    }
  }

  /**
   * Получить анализ по ID
   */
  async getAnalysisById(analysisId) {
    try {
      const analysis = await database.get(`
        SELECT * FROM document_analysis WHERE id = ?
      `, [analysisId]);

      if (!analysis) {
        return null;
      }

      // Парсим JSON поля
      return {
        id: analysis.id,
        userId: analysis.user_id,
        documentId: analysis.document_id,
        analysis: {
          summary: { mainIssues: JSON.parse(analysis.risks || '[]') },
          recommendations: JSON.parse(analysis.recommendations || '[]'),
          confidence: analysis.confidence
        },
        metadata: {
          analyzedAt: analysis.created_at,
          documentType: analysis.summary,
          fileName: `analysis_${analysis.id}`,
          docId: analysis.id,
          modelUsed: analysis.model_used
        }
      };
    } catch (error) {
      logger.error('Ошибка получения анализа из БД:', error);
      throw error;
    }
  }

  /**
   * Получить анализ по ID документа
   */
  async getAnalysisByDocumentId(documentId) {
    try {
      const analysis = await database.get(`
        SELECT * FROM document_analysis WHERE document_id = ? ORDER BY created_at DESC LIMIT 1
      `, [documentId]);

      if (!analysis) {
        return null;
      }

      // Парсим JSON поля
      return {
        id: analysis.id,
        userId: analysis.user_id,
        documentId: analysis.document_id,
        analysis: {
          summary: { mainIssues: JSON.parse(analysis.risks || '[]') },
          recommendations: JSON.parse(analysis.recommendations || '[]'),
          confidence: analysis.confidence
        },
        metadata: {
          analyzedAt: analysis.created_at,
          documentType: analysis.summary,
          fileName: `analysis_${analysis.id}`,
          docId: analysis.id,
          modelUsed: analysis.model_used
        }
      };
    } catch (error) {
      logger.error('Ошибка получения анализа по ID документа из БД:', error);
      throw error;
    }
  }

  /**
   * Получить список анализов пользователя
   */
  async getUserAnalyses(userId) {
    try {
      const analyses = await database.all(`
        SELECT id, user_id, document_id, summary, risks, 
               recommendations, confidence, created_at, updated_at
        FROM document_analysis 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [userId]);

      return analyses.map(analysis => ({
        id: analysis.id,
        metadata: {
          fileName: `analysis_${analysis.id}`,
          analyzedAt: analysis.created_at,
          documentType: analysis.summary,
          docId: analysis.id,
          confidence: analysis.confidence
        }
      }));
    } catch (error) {
      logger.error('Ошибка получения анализов пользователя из БД:', error);
      throw error;
    }
  }

  /**
   * Получить все анализы (для админа)
   */
  async getAllAnalyses() {
    try {
      const analyses = await database.all(`
        SELECT id, user_id, document_id, summary, risks, 
               recommendations, confidence, created_at, updated_at
        FROM document_analysis 
        ORDER BY created_at DESC
      `);

      return analyses.map(analysis => ({
        id: analysis.id,
        metadata: {
          fileName: `analysis_${analysis.id}`,
          analyzedAt: analysis.created_at,
          documentType: analysis.summary,
          docId: analysis.id,
          confidence: analysis.confidence
        }
      }));
    } catch (error) {
      logger.error('Ошибка получения всех анализов из БД:', error);
      throw error;
    }
  }

  /**
   * Удалить анализ
   */
  async deleteAnalysis(analysisId) {
    try {
      await database.run(`
        DELETE FROM document_analysis WHERE id = ?
      `, [analysisId]);

      logger.info('Анализ удален из БД', { analysisId });
      return true;
    } catch (error) {
      logger.error('Ошибка удаления анализа из БД:', error);
      throw error;
    }
  }

  /**
   * Обновить анализ
   */
  async updateAnalysis(analysisId, analysisData) {
    try {
      await database.run(`
        UPDATE document_analysis SET
          risks = ?,
          recommendations = ?,
          summary = ?,
          confidence = ?,
          model_used = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        JSON.stringify(analysisData.summary?.mainIssues || []),
        JSON.stringify(analysisData.recommendations || []),
        analysisData.summary?.documentType || 'unknown',
        analysisData.confidence || 0.85,
        analysisData.modelUsed || 'gpt-4o',
        new Date().toISOString(),
        analysisId
      ]);

      logger.info('Анализ обновлен в БД', { analysisId });
      return true;
    } catch (error) {
      logger.error('Ошибка обновления анализа в БД:', error);
      throw error;
    }
  }
}

module.exports = new AnalysisService();

