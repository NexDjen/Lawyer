const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Путь к файлу статистики
const STATS_FILE = path.join(__dirname, '../data/openai_stats.json');
const DAILY_STATS_FILE = path.join(__dirname, '../data/daily_stats.json');

// Инициализация файлов статистики если они не существуют
async function initializeStatsFiles() {
  try {
    await fs.access(STATS_FILE);
  } catch {
    const initialStats = {
      totalTokens: 0,
      totalCost: 0,
      totalRequests: 0,
      avgTokensPerRequest: 0,
      avgCostPerRequest: 0,
      currentMonth: new Date().toISOString().slice(0, 7),
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(STATS_FILE, JSON.stringify(initialStats, null, 2));
  }

  try {
    await fs.access(DAILY_STATS_FILE);
  } catch {
    await fs.writeFile(DAILY_STATS_FILE, JSON.stringify([], null, 2));
  }
}

// Получение статистики OpenAI
router.get('/openai-stats', async (req, res) => {
  try {
    await initializeStatsFiles();
    const statsData = await fs.readFile(STATS_FILE, 'utf8');
    const stats = JSON.parse(statsData);
    
    res.json(stats);
  } catch (error) {
    console.error('Ошибка при получении статистики OpenAI:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

// Получение дневной статистики
router.get('/daily-stats', async (req, res) => {
  try {
    await initializeStatsFiles();
    const dailyData = await fs.readFile(DAILY_STATS_FILE, 'utf8');
    const dailyStats = JSON.parse(dailyData);
    
    res.json(dailyStats);
  } catch (error) {
    console.error('Ошибка при получении дневной статистики:', error);
    res.status(500).json({ error: 'Ошибка при получении дневной статистики' });
  }
});

// Сброс статистики
router.post('/reset-stats', async (req, res) => {
  try {
    const initialStats = {
      totalTokens: 0,
      totalCost: 0,
      totalRequests: 0,
      avgTokensPerRequest: 0,
      avgCostPerRequest: 0,
      currentMonth: new Date().toISOString().slice(0, 7),
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(STATS_FILE, JSON.stringify(initialStats, null, 2));
    await fs.writeFile(DAILY_STATS_FILE, JSON.stringify([], null, 2));
    
    res.json({ message: 'Статистика успешно сброшена' });
  } catch (error) {
    console.error('Ошибка при сбросе статистики:', error);
    res.status(500).json({ error: 'Ошибка при сбросе статистики' });
  }
});

// Получение настроек API
router.get('/api-settings', async (req, res) => {
  try {
    const settings = {
      model: process.env.OPENAI_MODEL || 'gpt-4.1-nano',
      maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
      temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
      apiStatus: process.env.OPENAI_API_KEY ? 'active' : 'inactive'
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Ошибка при получении настроек API:', error);
    res.status(500).json({ error: 'Ошибка при получении настроек API' });
  }
});

// Обновление настроек API
router.put('/api-settings', async (req, res) => {
  try {
    const { model, maxTokens, temperature } = req.body;
    
    // В реальном приложении здесь нужно обновить переменные окружения
    // Для демонстрации просто возвращаем обновленные настройки
    const settings = {
      model: model || process.env.OPENAI_MODEL || 'gpt-4.1-nano',
      maxTokens: maxTokens || parseInt(process.env.MAX_TOKENS) || 4000,
      temperature: temperature || parseFloat(process.env.TEMPERATURE) || 0.7,
      apiStatus: process.env.OPENAI_API_KEY ? 'active' : 'inactive'
    };
    
    res.json({ message: 'Настройки обновлены', settings });
  } catch (error) {
    console.error('Ошибка при обновлении настроек API:', error);
    res.status(500).json({ error: 'Ошибка при обновлении настроек API' });
  }
});

module.exports = router; 