const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WindexAIStats = require('../models/WindexAIStats');
const database = require('../database/database');
const logger = require('../utils/logger');

// Получение статистики WindexAI
router.get('/windexai-stats', async (req, res) => {
  try {
    const stats = await WindexAIStats.getOverallStats();
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    logger.error('Ошибка при получении статистики WindexAI:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении статистики',
      details: error.message 
    });
  }
});

// Получение статистики OpenAI (алиас для совместимости)
router.get('/openai-stats', async (req, res) => {
  try {
    const stats = await WindexAIStats.getOverallStats();
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    logger.error('Ошибка при получении статистики OpenAI:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении статистики',
      details: error.message 
    });
  }
});

// Получение дневной статистики
router.get('/daily-stats', async (req, res) => {
  try {
    const dailyStats = await WindexAIStats.getDailyStats(30);
    
    res.json({
      success: true,
      stats: dailyStats
    });
  } catch (error) {
    logger.error('Ошибка при получении дневной статистики:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении дневной статистики',
      details: error.message 
    });
  }
});

// Получение всех пользователей
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll();
    
    res.json({
      success: true,
      users: users.map(user => user.toJSON())
    });
  } catch (error) {
    logger.error('Ошибка при получении пользователей:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении пользователей',
      details: error.message 
    });
  }
});

// Сброс статистики
router.post('/reset-stats', async (req, res) => {
  try {
    await WindexAIStats.cleanupOldRecords(0); // Удаляем все записи
    
    res.json({ 
      success: true,
      message: 'Статистика успешно сброшена' 
    });
  } catch (error) {
    logger.error('Ошибка при сбросе статистики:', error);
    res.status(500).json({ 
      error: 'Ошибка при сбросе статистики',
      details: error.message 
    });
  }
});

// Получение настроек API
router.get('/api-settings', async (req, res) => {
  try {
    const settings = {
      model: process.env.WINDEXAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.WINDEXAI_MAX_TOKENS) || 4000,
      temperature: parseFloat(process.env.WINDEXAI_TEMPERATURE) || 0.7,
      apiStatus: process.env.WINDEXAI_API_KEY ? 'active' : 'inactive'
    };
    
    res.json({
      success: true,
      ...settings
    });
  } catch (error) {
    logger.error('Ошибка при получении настроек API:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении настроек API',
      details: error.message 
    });
  }
});

// Получение статистики базы данных
router.get('/database-stats', async (req, res) => {
  try {
    const stats = await database.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Ошибка при получении статистики БД:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении статистики БД',
      details: error.message 
    });
  }
});

// Получение детальной статистики для админ-панели
router.get('/admin-stats', async (req, res) => {
  try {
    const adminStats = await WindexAIStats.getAdminStats();
    
    res.json({
      success: true,
      ...adminStats
    });
  } catch (error) {
    logger.error('Ошибка при получении админ статистики:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении админ статистики',
      details: error.message 
    });
  }
});

// Обновление настроек API
router.put('/api-settings', async (req, res) => {
  try {
    const { model, maxTokens, temperature } = req.body;
    
    // В реальном приложении здесь нужно обновить переменные окружения
    // Для демонстрации просто возвращаем обновленные настройки
    const settings = {
      model: model || process.env.WINDEXAI_MODEL || 'gpt-4o-mini',
      maxTokens: maxTokens || parseInt(process.env.WINDEXAI_MAX_TOKENS) || 4000,
      temperature: temperature || parseFloat(process.env.WINDEXAI_TEMPERATURE) || 0.7,
      apiStatus: process.env.WINDEXAI_API_KEY ? 'active' : 'inactive'
    };
    
    res.json({ 
      success: true,
      message: 'Настройки обновлены', 
      settings 
    });
  } catch (error) {
    logger.error('Ошибка при обновлении настроек API:', error);
    res.status(500).json({ 
      error: 'Ошибка при обновлении настроек API',
      details: error.message 
    });
  }
});

module.exports = router; 