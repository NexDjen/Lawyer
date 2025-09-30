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

      // Объединяем историю из разных форматов
      const allHistory = [...conversationHistory, ...history];
      const validatedHistory = chatService.validateConversationHistory(allHistory);

      logger.info('Processing chat message', {
        messageLength: message.length,
        historyLength: validatedHistory.length,
        useWebSearch,
        hasUserId: !!userId
      });

      // Обработка сообщения через сервис
      const response = await chatService.processMessage(message, validatedHistory, useWebSearch, userId);

      // Генерируем аудио ответ (без фатала при отсутствии ключа)
      let audioBuffer = null;
      let audioUrl = null;
      try {
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
          const { synthesizeSpeech } = require('../services/openaiTTSService');
          audioBuffer = await synthesizeSpeech(response, { voice: 'nova', model: 'tts-1' });
        }
      } catch (ttsError) {
        logger.warn('TTS unavailable, continue without audio', { error: ttsError.message });
        audioBuffer = null;
      }
      
      // Сохраняем аудио файл только если TTS сработал
      if (audioBuffer) {
        const fs = require('fs');
        const path = require('path');
        const audioFileName = `chat_response_${Date.now()}.mp3`;
        
        // Сохраняем в папку uploads/audio для отображения в списке
        const audioPath = path.join(__dirname, '../uploads/audio', audioFileName);
        
        if (!fs.existsSync(path.dirname(audioPath))) {
          fs.mkdirSync(path.dirname(audioPath), { recursive: true });
        }
        
        fs.writeFileSync(audioPath, audioBuffer);
        audioUrl = `/api/court/audio-files/${audioFileName}`;
      }

      const result = {
        response,
        audioUrl,
        timestamp: new Date().toISOString(),
        model: process.env.WINDEXAI_MODEL || 'gpt-4o-mini'
      };

      res.json(result);

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
      const stats = await chatService.getUsageStats();
      
      if (!stats) {
        return res.status(404).json({
          error: 'Статистика недоступна'
        });
      }

      res.json(stats);

    } catch (error) {
      logger.error('Error getting usage stats', error);
      res.status(500).json({
        error: 'Ошибка при получении статистики'
      });
    }
  }

  // Проверка состояния API
  async checkApiStatus(req, res) {
    try {
      const hasApiKey = !!process.env.WINDEXAI_API_KEY;
      
      res.json({
        status: hasApiKey ? 'configured' : 'not_configured',
        model: process.env.WINDEXAI_MODEL || 'gpt-4o-mini',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error checking API status', error);
      res.status(500).json({
        error: 'Ошибка при проверке состояния API'
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