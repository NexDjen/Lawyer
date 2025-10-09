const chatService = require('../services/chatService');
const logger = require('../utils/logger');

class ChatController {
  // Обработка сообщения чата
  async handleChatMessage(req, res) {
    try {
      const { 
        message, 
        conversationHistory = [], 
        history = [], // Поддержка нового формата истории
        useWebSearch = true,
        userId = null // ID пользователя для персонализации
      } = req.body;

      // Валидация входных данных
      try {
        chatService.validateMessage(message);
      } catch (validationError) {
        return res.status(400).json({
          error: validationError.message
        });
      }

      // Получаем модель из запроса или используем модель по умолчанию
      const requestedModel = req.body.model || process.env.WINDEXAI_MODEL || 'gpt-4o-mini';

      // Объединяем историю из разных форматов
      const allHistory = [...conversationHistory, ...history];
      const validatedHistory = chatService.validateConversationHistory(allHistory);

      logger.info('Processing chat message', {
        messageLength: message.length,
        historyLength: validatedHistory.length,
        useWebSearch,
        hasUserId: !!userId,
        requestedModel
      });

      // Обработка сообщения через сервис
      const response = await chatService.processMessage(message, validatedHistory, useWebSearch, userId, requestedModel);

      // Генерируем уникальное имя для аудио файла заранее
      const audioFileName = `chat_response_${Date.now()}.mp3`;
      const audioUrl = `/api/court/audio-files/${audioFileName}`;

      // Немедленно отправляем ответ клиенту (не ждем TTS)
      const result = {
        response,
        audioUrl, // Клиент будет запрашивать аудио по этому URL
        timestamp: new Date().toISOString(),
        model: requestedModel
      };
      res.json(result);

      // Генерируем TTS асинхронно в фоне (не блокирует ответ)
      setImmediate(async () => {
        try {
          if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
            const { synthesizeSpeech } = require('../services/openaiTTSService');
            const audioBuffer = await synthesizeSpeech(response, { voice: 'nova', model: 'tts-1' });
            
            if (audioBuffer) {
              const fs = require('fs');
              const path = require('path');
              const audioPath = path.join(__dirname, '../uploads/audio', audioFileName);
              
              if (!fs.existsSync(path.dirname(audioPath))) {
                fs.mkdirSync(path.dirname(audioPath), { recursive: true });
              }
              
              fs.writeFileSync(audioPath, audioBuffer);
              logger.info('✅ TTS audio generated successfully', { audioFileName, size: audioBuffer.length });
            }
          }
        } catch (ttsError) {
          logger.warn('⚠️ Background TTS generation failed', { 
            error: ttsError.message,
            audioFileName 
          });
        }
      });

    } catch (error) {
      logger.error('Chat controller error', {
        error: error.message,
        stack: error.stack
      });

      const statusCode = error.message.includes('API ключ') ? 401 :
                        error.message.includes('лимит') ? 429 :
                        error.message.includes('неверный') ? 401 : 500;

      res.status(statusCode).json({
        error: error.message
      });
    }
  }

  // Получение статистики использования
  async getUsageStats(req, res) {
    try {
      // Базовая статистика системы
      const stats = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'
        },
        api: {
          windexaiConfigured: !!process.env.WINDEXAI_API_KEY,
          openaiConfigured: !!process.env.OPENAI_API_KEY,
          model: process.env.WINDEXAI_MODEL || 'gpt-4o-mini',
          maxTokens: parseInt(process.env.WINDEXAI_MAX_TOKENS) || 15000
        },
        usage: {
          totalMessages: 0, // TODO: реализовать подсчет из базы данных
          totalUsers: 0,    // TODO: реализовать подсчет из базы данных
          averageResponseTime: 0 // TODO: реализовать метрики
        },
        timestamp: new Date().toISOString()
      };
      
      res.json({ 
        success: true, 
        data: stats
      });

    } catch (error) {
      logger.error('Error getting usage stats', error);
      res.status(500).json({
        error: 'Ошибка при получении статистики',
        details: error.message
      });
    }
  }

  // Проверка состояния API
  async checkApiStatus(req, res) {
    try {
      const hasApiKey = !!process.env.WINDEXAI_API_KEY;
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
      
      // Простая проверка доступности API
      const apiStatus = {
        windexai: {
          configured: hasApiKey,
          model: process.env.WINDEXAI_MODEL || 'gpt-4o-mini',
          maxTokens: parseInt(process.env.WINDEXAI_MAX_TOKENS) || 15000
        },
        openai: {
          configured: hasOpenAIKey,
          ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1'
        },
        server: {
          status: 'running',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        }
      };
      
      res.json(apiStatus);

    } catch (error) {
      logger.error('Error checking API status', error);
      res.status(500).json({
        error: 'Ошибка при проверке состояния API',
        details: error.message
      });
    }
  }

  // Получение информации о модели
  async getModelInfo(req, res) {
    try {
      const modelInfo = {
        name: process.env.WINDEXAI_MODEL || 'gpt-4o-mini',
        maxTokens: parseInt(process.env.WINDEXAI_MAX_TOKENS) || 4000,
        temperature: parseFloat(process.env.WINDEXAI_TEMPERATURE) || 0.7,
        features: ['chat', 'legal_consultation', 'document_analysis']
      };

      res.json(modelInfo);

    } catch (error) {
      logger.error('Error getting model info', error);
      res.status(500).json({
        error: 'Ошибка при получении информации о модели'
      });
    }
  }


}

module.exports = new ChatController(); 