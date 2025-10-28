const logger = require('../utils/logger');
const database = require('../database/database');
const chatService = require('../services/chatService');

class ChatController {
  // Обработка сообщения чата
  async handleChatMessage(req, res) {
    // Manage chat session memory
    let { sessionId } = req.body;
    const userId = req.body.userId || "1";
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
      // create new session
      await database.run(
        'INSERT INTO chat_sessions (id, user_id, is_active) VALUES (?, ?, ?)',
        [sessionId, userId, 1]
      );
    }
    // Load prior messages
    const prior = await database.all(
      'SELECT type, content FROM chat_messages WHERE session_id = ? ORDER BY created_at',
      [sessionId]
    );
    const dbHistory = prior.map(m => ({ role: m.type === 'bot' ? 'bot' : m.type === 'user' ? 'user' : 'system', content: m.content }));
    // Replace conversation history
    const { message, useWebSearch = true, model, professionalMode = true, docId } = req.body;
    const validatedHistory = dbHistory;
    // Log incoming user message
    const userMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    await database.run(
      'INSERT INTO chat_messages (id, session_id, user_id, type, content) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, sessionId, userId, 'user', message]
    );

    // Валидация входных данных
    try {
      chatService.validateMessage(message);
    } catch (validationError) {
      return res.status(400).json({
        error: validationError.message
      });
    }

    // Получаем модель из запроса или используем модель по умолчанию
    const requestedModel = req.body.model || process.env.WINDEXAI_MODEL || 'gpt-4o';

    // If a document analysis ID is provided, load its analysis and include in context
    if (docId) {
      try {
        const analysisService = require('../services/analysisService');
        const documentStorageService = require('../services/documentStorageService');
        // Load analysis summary by document ID
        const analysis = await analysisService.getAnalysisByDocumentId(docId);
        // Load full document content if available
        const docRecord = await documentStorageService.getDocumentById(docId);
        const fullText = docRecord?.extracted_text || docRecord?.content || 'Содержимое документа недоступно';
        // Prepend full text context
        allHistory.unshift({ role: 'system', content: `Содержание документа:\n${fullText}` });
        // Then prepend summary for quick overview
        if (analysis) {
          const summary = analysis.analysis.summary || {};
          const contextMsg = `Сводка анализа: Тип: ${summary.documentType || 'неизвестно'}, Уровень риска: ${summary.riskLevel || 'неизвестно'}, Основные проблемы: ${(summary.mainIssues||[]).join(', ')}`;
          allHistory.unshift({ role: 'system', content: contextMsg });
        }
      } catch (err) {
        logger.warn('Не удалось загрузить контекст документа для чата', { docId, error: err.message });
      }
    }

    logger.info('Processing chat message', {
      messageLength: message.length,
      historyLength: validatedHistory.length,
      useWebSearch,
      hasUserId: !!userId,
      requestedModel,
      professionalMode
    });

    // Обработка сообщения через сервис
    const response = await chatService.processMessage(message, validatedHistory, useWebSearch, userId, requestedModel, professionalMode);
    // Save bot response
    const botMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    await database.run(
      'INSERT INTO chat_messages (id, session_id, user_id, type, content) VALUES (?, ?, ?, ?, ?)',
      [botMsgId, sessionId, userId, 'bot', response]
    );

    // Генерируем уникальное имя для аудио файла заранее
    const audioFileName = `chat_response_${Date.now()}.mp3`;
    const audioUrl = `/api/court/audio-files/${audioFileName}`;

    // Форматируем ответ для отображения
    const formattedResponse = chatService.formatForDisplay(response);

    // Немедленно отправляем ответ клиенту (не ждем TTS)
    const result = {
      response,
      formattedResponse, // HTML-форматированная версия
      audioUrl, // Клиент будет запрашивать аудио по этому URL
      timestamp: new Date().toISOString(),
      model: requestedModel,
      professionalMode
    };
    // Include sessionId for client
    res.json({ ...result, sessionId });

    // Генерируем TTS асинхронно в фоне (не блокирует ответ)
    setImmediate(async () => {
      try {
        const googleTTSService = require('../services/googleTTSService');
        if (googleTTSService.isConfigured()) {
          const audioBuffer = await googleTTSService.synthesizeSpeech(response, { 
            voice: 'ru-RU-Chirp3-HD-Orus', 
            languageCode: 'ru-RU' 
          });
          
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
          model: process.env.WINDEXAI_MODEL || 'gpt-4o',
          maxTokens: parseInt(process.env.WINDEXAI_MAX_TOKENS) || 4000
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
          model: process.env.WINDEXAI_MODEL || 'gpt-4o',
          maxTokens: parseInt(process.env.WINDEXAI_MAX_TOKENS) || 4000
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
        name: process.env.WINDEXAI_MODEL || 'gpt-4o',
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