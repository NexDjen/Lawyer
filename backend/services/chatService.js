const WindexAI = require('openai'); // WindexAI API client
const config = require('../config/config');
const logger = require('../utils/logger');
const { readDb } = require('./documentStorage');
const { HttpsProxyAgent } = require('https-proxy-agent');
const PersonalDataExtractor = require('./personalDataExtractor');
const UserProfileService = require('./userProfileService');

class ChatService {
  constructor() {
    // Настройка прокси для обхода географических ограничений
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    
    logger.info('🔧 ChatService initialization', {
      hasProxy: !!proxyUrl,
      proxyUrl: proxyUrl ? proxyUrl.replace(/\/\/.*@/, '//***@') : 'none',
      hasApiKey: !!config.windexai.apiKey
    });

    this.windexai = new WindexAI({
      apiKey: config.windexai.apiKey,
      baseURL: 'https://api.windexai.com/v1',
      httpAgent: agent,
      httpsAgent: agent
    });

    // Инициализация сервисов для работы с персональными данными
    this.dataExtractor = new PersonalDataExtractor();
    this.profileService = new UserProfileService();
  }

  // Формирование промпта для AI
  async buildPrompt(message, conversationHistory = [], useWebSearch = true, userId = null) {
    const basePrompt = `Ты - опытный юрист-консультант Галина. Твоя задача - предоставлять точные, практичные и понятные юридические консультации.

ПРАВИЛА:
1. Отвечай кратко и по делу
2. Всегда указывай конкретные статьи законов
3. Давай готовые формулировки
4. Объясняй простым языком
5. Если не уверена - скажи об этом

ЗАПРЕЩЕНО:
- Шаблонные фразы типа "обнаружены риски", "рекомендуется уточнить"
- Общие рекомендации без конкретики
- Ответы без ссылок на законы

ОБЯЗАТЕЛЬНО:
- Конкретные пункты и статьи
- Готовые формулировки
- Практические действия
- Номера статей законов`;

    const historyContext = conversationHistory.length > 0 
      ? `\n\nИстория разговора:\n${conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n')}`
      : '';
    const personalization = '\n\nОбращайся к пользователю уважительно, но без персональных данных. Каждая беседа - новая сессия.';

    const webSearchContext = useWebSearch 
      ? '\n\nИспользуй актуальную информацию из интернета для более точных ответов.'
      : '\n\nОтвечай только на основе базовых знаний, без веб-поиска.';

    // Получаем контекст пользователя для персонализации
    const userContext = userId ? await this.getUserContext(userId) : '';

    return `${basePrompt}${personalization}${historyContext}${webSearchContext}${userContext}\n\nВопрос: ${message}\n\nОтвет:`;
  }

  // Обработка сообщения через WindexAI
  async processMessage(message, conversationHistory = [], useWebSearch = true, userId = null) {
    // Извлекаем персональные данные из сообщения пользователя
    if (userId) {
      await this.extractAndSavePersonalData(message, userId);
    }
    
    return this.generateResponse(message, conversationHistory, useWebSearch, userId);
  }

  // Генерация ответа (для WebSocket)
  async generateResponse(message, conversationHistory = [], useWebSearch = true, userId = null) {
    try {
      logger.info('🔍 ChatService.generateResponse called', {
        messageLength: message.length,
        hasApiKey: !!config.windexai.apiKey,
        apiKeyPrefix: config.windexai.apiKey ? config.windexai.apiKey.substring(0, 8) + '...' : 'NOT_SET',
        model: config.windexai.model,
        conversationHistoryLength: conversationHistory.length
      });

      if (!config.windexai.apiKey) {
        logger.error('❌ WindexAI API ключ не настроен');
        throw new Error('WindexAI API ключ не настроен');
      }

      // Собираем контекст из пользовательских документов (OCR результаты)
      // ВРЕМЕННО ОТКЛЮЧЕНО для изоляции пользователей
      let userContext = '';
      logger.info('User context loading temporarily disabled for user isolation');

      const prompt = await this.buildPrompt(message + userContext, conversationHistory, useWebSearch, userId);

      logger.info('🤖 Sending request to WindexAI', {
        model: config.windexai.model,
        promptLength: prompt.length,
        maxTokens: config.windexai.maxTokens,
        temperature: config.windexai.temperature
      });

      const completion = await this.windexai.chat.completions.create({
        model: config.windexai.model,
        messages: [
          {
            role: 'system',
            content: 'Ты - опытный юрист-консультант Галина. Отвечай кратко, по делу, с указанием конкретных статей законов.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.windexai.maxTokens,
        temperature: config.windexai.temperature,
        stream: false
      });

      logger.info('✅ WindexAI response received', {
        responseLength: completion.choices[0]?.message?.content?.length || 0,
        usage: completion.usage
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        throw new Error('Получен пустой ответ от WindexAI');
      }

      logger.info('Chat message processed successfully', {
        messageLength: message.length,
        responseLength: response.length,
        model: config.windexai.model
      });

      return response;

    } catch (error) {
      logger.error('❌ Error processing chat message', {
        error: error.message,
        errorCode: error.code,
        errorType: error.type,
        message: message.substring(0, 100),
        stack: error.stack
      });

      // Проверяем на географические ограничения или другие ошибки WindexAI
      if (error.message.includes('Country, region, or territory not supported') || 
          error.message.includes('403') ||
          error.code === 'insufficient_quota' ||
          error.code === 'invalid_api_key' ||
          error.code === 'rate_limit_exceeded') {
        
        // Возвращаем fallback ответ вместо ошибки
        logger.warn('⚠️ WindexAI недоступен, используем fallback ответ', {
          reason: error.message,
          code: error.code
        });
        return this.getFallbackResponse(message);
      } else {
        logger.error('💥 Unexpected error, throwing exception', {
          error: error.message,
          code: error.code
        });
        throw new Error(`Ошибка обработки запроса: ${error.message}`);
      }
    }
  }

  // Валидация входящего сообщения
  validateMessage(message) {
    if (!message || typeof message !== 'string') {
      throw new Error('Сообщение должно быть строкой');
    }

    if (message.trim().length === 0) {
      throw new Error('Сообщение не может быть пустым');
    }

    if (message.length > 4000) {
      throw new Error('Сообщение слишком длинное (максимум 4000 символов)');
    }

    return true;
  }

  // Валидация истории разговора
  validateConversationHistory(history) {
    if (!Array.isArray(history)) {
      return [];
    }

    return history.filter(msg => 
      msg && 
      typeof msg === 'object' && 
      msg.type && 
      msg.content &&
      ['user', 'bot', 'system'].includes(msg.type)
    ).slice(-10); // Ограничиваем последними 10 сообщениями
  }

  // Fallback ответы при недоступности WindexAI
  getFallbackResponse(message) {
    logger.info('🔄 Using fallback response', { message: message.substring(0, 50) });
    
    const lowerMessage = message.toLowerCase();
    
    // Простые правила для базовых ответов
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
      return 'Привет! Я юрист-консультант Галина. К сожалению, сейчас у меня временные проблемы с подключением к базе знаний. Но я готова помочь вам с базовыми юридическими вопросами. Что вас интересует?';
    }
    
    if (lowerMessage.includes('договор') || lowerMessage.includes('контракт')) {
      return 'По вопросам договоров рекомендую обратиться к юристу лично. Основные моменты: проверьте все условия, укажите сроки, ответственность сторон. Важно заверить у нотариуса, если требуется по закону.';
    }
    
    if (lowerMessage.includes('развод') || lowerMessage.includes('брак')) {
      return 'При разводе через суд нужны документы о браке, имуществе, детях. Срок рассмотрения - до 3 месяцев. Рекомендую обратиться к семейному юристу для детальной консультации.';
    }
    
    if (lowerMessage.includes('наследство') || lowerMessage.includes('наследник')) {
      return 'Наследство принимается в течение 6 месяцев. Нужно обратиться к нотариусу с заявлением и документами. Если срок пропущен, можно восстановить через суд при уважительных причинах.';
    }
    
    if (lowerMessage.includes('трудовой') || lowerMessage.includes('увольнение')) {
      return 'При увольнении работодатель должен выплатить зарплату, компенсацию за отпуск. Уведомление - за 2 недели. При нарушении прав обращайтесь в трудовую инспекцию или суд.';
    }
    
    // Общий ответ
    return 'Спасибо за ваш вопрос! К сожалению, сейчас у меня временные проблемы с доступом к полной базе знаний. Для получения детальной юридической консультации рекомендую обратиться к юристу лично или в юридическую консультацию.';
  }

  // Получение статистики использования
  async getUsageStats() {
    try {
      if (!config.windexai.apiKey) {
        return null;
      }

      const usage = await this.windexai.usage.retrieve();
      return {
        totalTokens: usage.total_usage,
        model: config.windexai.model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting usage stats', error);
      return null;
    }
  }

  /**
   * Извлекает и сохраняет персональные данные из сообщения пользователя
   * @param {string} message - Сообщение пользователя
   * @param {string} userId - ID пользователя
   */
  async extractAndSavePersonalData(message, userId) {
    try {
      // Получаем существующий профиль пользователя
      const existingProfile = await this.profileService.getUserProfile(userId);
      
      // Извлекаем данные из сообщения
      const extractedData = this.dataExtractor.extractPersonalData(message, existingProfile.personalData);
      
      // Если найдены персональные данные или важные заметки о деле
      if (Object.keys(extractedData.personalData).length > 0 || extractedData.caseNotes.length > 0) {
        
        // Обновляем профиль пользователя
        await this.profileService.updateUserProfile(userId, {
          personalData: extractedData.personalData,
          caseNotes: extractedData.caseNotes
        });
        
        logger.info('Персональные данные обновлены в профиле', {
          userId: this.profileService.maskUserId(userId),
          extractedFields: Object.keys(extractedData.personalData),
          caseNotesAdded: extractedData.caseNotes.length
        });
      }
      
      // Очистка старых данных (выполняется периодически)
      if (Math.random() < 0.1) { // 10% шанс запуска очистки
        await this.profileService.cleanupOldData(userId);
      }
      
    } catch (error) {
      logger.error('Ошибка извлечения персональных данных', {
        userId: this.profileService.maskUserId(userId),
        error: error.message
      });
      // Не прерываем основной процесс чата в случае ошибки
    }
  }

  /**
   * Получает контекст пользователя для персонализации ответов
   * @param {string} userId - ID пользователя
   * @returns {string} Контекст пользователя
   */
  async getUserContext(userId) {
    try {
      const profile = await this.profileService.getUserProfile(userId);
      
      // Формируем контекст на основе доступных данных
      const contextParts = [];
      
      if (profile.personalData.fullName || profile.personalData.firstName) {
        const name = profile.personalData.fullName || profile.personalData.firstName;
        contextParts.push(`Клиент: ${name}`);
      }
      
      if (profile.personalData.occupation) {
        contextParts.push(`Профессия: ${profile.personalData.occupation}`);
      }
      
      if (profile.personalData.maritalStatus) {
        contextParts.push(`Семейное положение: ${profile.personalData.maritalStatus}`);
      }
      
      // Добавляем важные заметки о деле (последние 3)
      const importantNotes = profile.caseNotes
        .filter(note => note.importance >= 7)
        .slice(-3);
      
      if (importantNotes.length > 0) {
        contextParts.push('Важная информация о деле:');
        importantNotes.forEach(note => {
          contextParts.push(`- ${note.content}`);
        });
      }
      
      return contextParts.length > 0 
        ? `\n\nКонтекст клиента:\n${contextParts.join('\n')}`
        : '';
        
    } catch (error) {
      logger.error('Ошибка получения контекста пользователя', {
        userId: this.profileService.maskUserId(userId),
        error: error.message
      });
      return '';
    }
  }
}

module.exports = new ChatService(); 