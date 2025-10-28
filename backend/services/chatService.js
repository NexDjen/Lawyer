const WindexAI = require('openai'); // WindexAI API client
const config = require('../config/config');
const logger = require('../utils/logger');
const { readDb } = require('./documentStorage');
const { HttpsProxyAgent } = require('https-proxy-agent');
const PersonalDataExtractor = require('./personalDataExtractor');
const UserProfileService = require('./userProfileService');
const WindexAIStats = require('../models/WindexAIStats');
const webSearchService = require('./webSearchService');

class ChatService {
  constructor() {
    // Настройка прокси для обхода географических ограничений
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    
    // Создаем пул HTTP соединений для оптимизации производительности
    const { Agent } = require('https');
    let agent;
    
    if (proxyUrl) {
      agent = new HttpsProxyAgent(proxyUrl, {
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 30000
      });
    } else {
      agent = new Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 30000
      });
    }
    
    logger.info('🔧 ChatService initialization', {
      hasProxy: !!proxyUrl,
      proxyUrl: proxyUrl ? proxyUrl.replace(/\/\/.*@/, '//***@') : 'none',
      hasApiKey: !!config.windexai.apiKey,
      httpPool: { keepAlive: true, maxSockets: 50 }
    });

    this.windexai = new WindexAI({
      apiKey: config.windexai.apiKey,
      httpAgent: agent,
      httpsAgent: agent,
      timeout: config.windexai.timeout,
      maxRetries: config.windexai.maxRetries || 2
    });

    // Инициализация сервисов для работы с персональными данными
    this.dataExtractor = new PersonalDataExtractor();
    this.profileService = new UserProfileService();
  }

  // Формирование промпта для AI
  async buildPrompt(message, conversationHistory = [], useWebSearch = true, userId = null, professionalMode = true) {
    const fs = require('fs');
    const path = require('path');
    const basePrompt = fs.readFileSync(path.resolve(__dirname, '../config/galina_prompt.txt'), 'utf-8');
    const historyContext = conversationHistory.length > 0 
      ? `\n\nИстория разговора (учитывай контекст предыдущих сообщений):\n${conversationHistory.map(msg => `${msg.type === 'user' ? 'Пользователь' : msg.type === 'bot' ? 'Юрист' : 'Система'}: ${msg.content}`).join('\n')}`
      : '';
    const personalization = conversationHistory.length > 0 
      ? '\n\nОбращайся к пользователю уважительно, но без персональных данных. Учитывай контекст предыдущих сообщений в разговоре.'
      : '\n\nОбращайся к пользователю уважительно, но без персональных данных. НЕ упоминай предыдущие темы или контекст - это новый разговор.';

    // Выполняем веб-поиск если включен
    let webSearchResults = '';
    if (useWebSearch) {
      logger.info('🌐 Performing web search for context');
      const searchResults = await webSearchService.searchWithContext(message, 3);
      if (searchResults) {
        webSearchResults = searchResults;
        logger.info('✅ Web search completed', { hasResults: !!searchResults });
      } else {
        logger.info('ℹ️ No web search results found');
      }
    }

    const webSearchContext = useWebSearch 
      ? '\n\nИспользуй актуальную информацию из интернета для более точных ответов, особенно судебную практику.'
      : '\n\nОтвечай только на основе базовых знаний, без веб-поиска.';

    // Получаем контекст пользователя только для сложных вопросов
    let userContext = '';
    logger.info('🔍 Checking user context loading conditions', {
      hasUserId: !!userId,
      conversationHistoryLength: conversationHistory.length,
      shouldLoadContext: !!(userId && conversationHistory.length > 0)
    });
    
    if (userId && conversationHistory.length > 0) {
      // Загружаем контекст только если есть история разговора (не новый чат)
      logger.info('📋 Loading user context for existing conversation');
      userContext = await this.getUserContext(userId);
    } else {
      logger.info('🚫 Skipping user context loading for new chat');
    }

    return `${basePrompt}${personalization}${historyContext}${webSearchContext}${webSearchResults}${userContext}\n\nВопрос: ${message}\n\nОтвет:`;
  }

  // Обработка сообщения через WindexAI
  async processMessage(message, conversationHistory = [], useWebSearch = true, userId = null, model = null, professionalMode = true) {
    // Извлекаем персональные данные из сообщения пользователя
    if (userId) {
      await this.extractAndSavePersonalData(message, userId);
    }

    return this.generateResponse(message, conversationHistory, useWebSearch, userId, model, professionalMode);
  }

  // Пост-обработка стиля для повышения профессионализма
  enforceProfessionalStyle(response) {
    return response
      .replace(/\b(факты|анализ|действия):/gi, '') // убираем заголовки
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Фильтр для усиления хищного стиля Галины
  galinaIntellectFilter(response) {
    // Усиливаем стратегический и хищный стиль речи
    return response
      .replace(/\b(рекомендую|советую|желательно|следует)\b/gi, 'используем')
      .replace(/\b(необходимо|нужно|следует)\b/gi, 'делаем')
      .replace(/\b(возможно|наверное|скорее всего)\b/gi, '')
      .replace(/\b(мы подадим|мы обратимся|мы запросим)\b/gi, 'мы выбиваем, мы требуем, мы запускаем')
      .replace(/\b(оппонент|банк|истец)\b/gi, 'противник')
      .replace(/Рекомендация:/gi, 'Ход:')
      .trim();
  }

  // Фильтр для стиля Галины 4.0 — стратег юрреализма
  galinaStyleFilters(response) {
    return response
      .replace(/\b(рекомендую|следует|желательно|возможно)\b/gi, 'мы делаем')
      .replace(/\b(адвокат|юрист|консультант)\b/gi, 'наша команда')
      .replace(/\b(обратитесь|попросите|посоветуйтесь)\b/gi, 'мы заявляем')
      .replace(/\b(оппонент|банк|истец)\b/gi, 'противник')
      .replace(/Рекомендация:/gi, 'Ход:')
      .trim();
  }

  // Риторический расширитель ответа Галины 4.0
  expandGalinaResponse(response) {
    if (response.split(/\s+/).length < 300) {
      response += '\n\nГалина добавляет: ';
      response += 'Мы используем не только нормы права, но и психологию процесса. ';
      response += 'Суд, оппоненты, надзор — это шахматная доска, на которой мы диктуем темп. ';
      response += 'Каждый документ становится элементом комбинации. ';
      response += 'Мы действуем на упреждение: экспертиза, уголовное производство, параллельное давление на банк. ';
      response += 'Ход: превращаем их атаку в нашу стратегическую возможность.';
    }
    return response.trim();
  }

  // Финальный фильтр естественной речи Галины 8.0
  galinaHumanize(response) {
    return response
      // Убираем структурные шаблоны
      .replace(/(\d+\.\s*)/g, '')
      .replace(/План действий:/gi, '')
      .replace(/Анализ и стратегия:/gi, '')
      .replace(/Контроль у нас\.?/gi, 'Ход за нами.')
      // Добавляем дыхание речи
      .replace(/\. ([А-Я])/g, '.\n\n$1')
      // Убираем сухие фразы
      .replace(/\b(необходимо|следует|желательно)\b/gi, 'мы сделаем')
      // Добавляем немного естественного стиля
      .trim();
  }

  // Форматирование ответа для отображения
  formatForDisplay(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/Рекомендация:/g, '<hr><strong>Рекомендация:</strong>')
      .replace(/\n/g, '<br>');
  }

  // Генерация ответа с контекстом документа
  async generateResponseWithContext(message, conversationHistory = [], systemContext = '', useWebSearch = true, userId = null, model = null, professionalMode = true) {
    try {
      // Используем модель из параметра или модель по умолчанию
      const selectedModel = model || config.windexai.model;

      logger.info('🔍 ChatService.generateResponseWithContext called', {
        messageLength: message.length,
        messagePreview: message.substring(0, 100),
        hasApiKey: !!config.windexai.apiKey,
        apiKeyPrefix: config.windexai.apiKey ? config.windexai.apiKey.substring(0, 8) + '...' : 'NOT_SET',
        selectedModel,
        conversationHistoryLength: conversationHistory.length,
        systemContextLength: systemContext.length,
        systemContextPreview: systemContext.substring(0, 200),
        professionalMode
      });

      if (!config.windexai.apiKey) {
        logger.error('❌ WindexAI API ключ не настроен');
        throw new Error('WindexAI API ключ не настроен');
      }

      // Собираем контекст из пользовательских документов (OCR результаты)
      // ВРЕМЕННО ОТКЛЮЧЕНО для изоляции пользователей
      let userContext = '';
      logger.info('User context loading temporarily disabled for user isolation');

      const prompt = await this.buildPrompt(message + userContext, conversationHistory, useWebSearch, userId, professionalMode);

      // Добавляем системный контекст в начало промпта
      const contextualPrompt = systemContext + '\n\n' + prompt;

      // Добавляем системную роль "юридический фильтр" для профессионального режима
      const messages = [{ role: 'user', content: contextualPrompt }];
      
      if (professionalMode) {
        messages.unshift({
          role: 'system',
          content: `Перед выдачей ответа проверь:
1. Используется ли юридическая терминология.
2. Нет ли эмоциональных или разговорных выражений.
3. Ответ сформулирован в деловом стиле.
4. Есть ли четкая структура: факты → анализ → действия.
5. Завершен ли ответ рекомендацией.

Если нужно — перепиши ответ, чтобы он соответствовал профессиональному стандарту юридического заключения.`
        });
      }

      logger.info('🤖 Sending request to WindexAI', {
        model: selectedModel,
        promptLength: contextualPrompt.length,
        promptPreview: contextualPrompt.substring(contextualPrompt.length - 200), // Последние 200 символов промпта
        maxTokens: config.windexai.maxTokens,
        temperature: config.windexai.temperature,
        professionalMode,
        messagesCount: messages.length
      });

      const completion = await this.windexai.chat.completions.create({
        model: selectedModel,                // use selected or default model
        messages: messages,
        max_tokens: 15000,                    // Production-ready extended response
        temperature: 0.9,                     // Optimal for charisma and precision
        top_p: 0.95,                         // Broader vocabulary
        presence_penalty: 1.2,               // Prevent repetitions
        stream: false,
        user: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      let response = completion.choices[0].message.content;

      // Применяем пост-обработку стиля для профессионального режима
      if (professionalMode) {
        response = this.enforceProfessionalStyle(response);
        response = this.galinaIntellectFilter(response);
        logger.info('🎯 Professional style enforcement applied');
      }

      // Финальный фильтр естественной речи (Galina 8.0)
      response = this.galinaHumanize(response);
      logger.info('✅ WindexAI response received', {
        responseLength: response.length,
        usage: completion.usage,
        professionalMode
      });

      return response;
    } catch (error) {
      logger.error('❌ Error in generateResponseWithContext:', error);
      throw error;
    }
  }

  // Генерация ответа (для WebSocket)
  async generateResponse(message, conversationHistory = [], useWebSearch = true, userId = null, model = null, professionalMode = true) {
    const startTime = Date.now();
    
    try {
      // Используем модель из параметра или модель по умолчанию
      const selectedModel = model || config.windexai.model;

      logger.info('🔍 ChatService.generateResponse called', {
        messageLength: message.length,
        messagePreview: message.substring(0, 100),
        hasApiKey: !!config.windexai.apiKey,
        apiKeyPrefix: config.windexai.apiKey ? config.windexai.apiKey.substring(0, 8) + '...' : 'NOT_SET',
        selectedModel,
        conversationHistoryLength: conversationHistory.length,
        professionalMode,
        historyPreview: conversationHistory.length > 0 ? conversationHistory.map(h => `${h.type}: ${h.content.substring(0, 50)}...`).join(' | ') : 'no history'
      });

      if (!config.windexai.apiKey) {
        logger.error('❌ WindexAI API ключ не настроен');
        throw new Error('WindexAI API ключ не настроен');
      }

      // Собираем контекст из пользовательских документов (OCR результаты)
      // ВРЕМЕННО ОТКЛЮЧЕНО для изоляции пользователей
      let userContext = '';
      logger.info('User context loading temporarily disabled for user isolation');

      const prompt = await this.buildPrompt(message + userContext, conversationHistory, useWebSearch, userId, professionalMode);

      // Добавляем системную роль "юридический фильтр" для профессионального режима
      const messages = [{ role: 'user', content: prompt }];
      
      if (professionalMode) {
        messages.unshift({
          role: 'system',
          content: `Перед выдачей ответа проверь:
1. Используется ли юридическая терминология.
2. Нет ли эмоциональных или разговорных выражений.
3. Ответ сформулирован в деловом стиле.
4. Есть ли четкая структура: факты → анализ → действия.
5. Завершен ли ответ рекомендацией.

Если нужно — перепиши ответ, чтобы он соответствовал профессиональному стандарту юридического заключения.`
        });
      }

      logger.info('🤖 Sending request to WindexAI', {
        model: selectedModel,
        promptLength: prompt.length,
        promptPreview: prompt.substring(prompt.length - 200), // Последние 200 символов промпта
        maxTokens: config.windexai.maxTokens,
        temperature: config.windexai.temperature,
        professionalMode,
        messagesCount: messages.length
      });

      const completion = await this.windexai.chat.completions.create({
        model: selectedModel,
        messages: messages,
        max_tokens: 15000,                    // Production-ready extended response
        temperature: 0.9,                     // Optimal for charisma and precision
        top_p: 0.95,                         // Broader vocabulary
        presence_penalty: 1.2,               // Prevent repetitions
        stream: false,
        user: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      logger.info('✅ WindexAI response received', {
        responseLength: completion.choices[0]?.message?.content?.length || 0,
        usage: completion.usage
      });

      let response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        throw new Error('Получен пустой ответ от WindexAI');
      }

      // Применяем пост-обработку стиля для профессионального режима
      if (professionalMode) {
        response = this.enforceProfessionalStyle(response);
        response = this.galinaIntellectFilter(response);
        logger.info('🎯 Professional style enforcement applied');
      }

      // Финальный фильтр естественной речи (Galina 8.0)
      response = this.galinaHumanize(response);
      logger.info('Chat message processed successfully', {
        messageLength: message.length,
        responseLength: response.length,
        model: config.windexai.model,
        professionalMode
      });

      // Записываем статистику использования WindexAI
      try {
        await WindexAIStats.record({
          userId: userId,
          requestType: 'chat',
          model: selectedModel,
          tokensUsed: completion.usage?.total_tokens || 0,
          cost: this.calculateCost(completion.usage),
          responseTime: Date.now() - startTime,
          professionalMode: professionalMode
        });
      } catch (statsError) {
        logger.warn('Ошибка записи статистики:', statsError);
      }

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

    if (message.length > 50000) {
      throw new Error('Сообщение слишком длинное (максимум 50000 символов)');
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
    
    // Простые правила для базовых ответов в профессиональном стиле
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
      return 'Добро пожаловать. Я — Галина, юрист-консультант. Готова предоставить правовую консультацию по Вашему вопросу. Опишите ситуацию для анализа.\n\n**Рекомендация:** сформулируйте конкретный правовой вопрос для получения детальной консультации.';
    }
    
    if (lowerMessage.includes('договор') || lowerMessage.includes('контракт')) {
      return 'По вопросам договорных отношений необходимо провести анализ конкретных условий соглашения. Основные аспекты: предмет договора, права и обязанности сторон, ответственность, сроки исполнения.\n\n**Рекомендация:** предоставьте текст договора для детального правового анализа.';
    }
    
    if (lowerMessage.includes('развод') || lowerMessage.includes('брак')) {
      return 'Расторжение брака регулируется нормами семейного права. Процедура зависит от наличия споров между супругами. Необходимо определить порядок раздела имущества и вопросы, связанные с детьми.\n\n**Рекомендация:** уточните конкретные обстоятельства дела для формирования правовой позиции.';
    }
    
    if (lowerMessage.includes('наследство') || lowerMessage.includes('наследник')) {
      return 'Наследственные правоотношения регулируются ГК РФ. Срок принятия наследства составляет 6 месяцев с момента открытия наследства. При пропуске срока возможно его восстановление в судебном порядке.\n\n**Рекомендация:** предоставьте документы для анализа наследственного дела.';
    }
    
    if (lowerMessage.includes('трудовой') || lowerMessage.includes('увольнение')) {
      return 'Трудовые отношения регулируются ТК РФ. При расторжении трудового договора работодатель обязан произвести все причитающиеся выплаты. Нарушение трудового законодательства влечет административную ответственность.\n\n**Рекомендация:** опишите конкретные обстоятельства трудового спора.';
    }
    
    // Общий профессиональный ответ
    return 'Благодарю за обращение. Для предоставления квалифицированной правовой консультации необходимо уточнить детали Вашей ситуации. Рекомендую обратиться к юристу для получения персональной консультации.\n\n**Рекомендация:** сформулируйте конкретный правовой вопрос с указанием обстоятельств дела.';
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
      // Проверяем, является ли сообщение простым вопросом (приветствие, общий вопрос)
      const simpleQuestionPatterns = [
        /^(привет|здравствуй|добрый день|добрый вечер|доброе утро)/i,
        /^(как дела|что нового|как поживаешь)/i,
        /^(спасибо|благодарю|спасибо большое)/i,
        /^(пока|до свидания|до встречи)/i,
        /^(хочу взять кредит|нужен кредит|как получить кредит)/i,
        /^(что нужно для|какие документы нужны для)/i
      ];
      
      const isSimpleQuestion = simpleQuestionPatterns.some(pattern => pattern.test(message.trim()));
      
      if (isSimpleQuestion) {
        logger.info('Пропускаем извлечение персональных данных для простого вопроса', {
          userId: this.profileService.maskUserId(userId),
          messagePreview: message.substring(0, 50)
        });
        return;
      }
      
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
      
      // Добавляем данные для документов
      const documentData = [];
      if (profile.personalData.fullName) {
        documentData.push(`fullName: ${profile.personalData.fullName}`);
      }
      if (profile.personalData.firstName) {
        documentData.push(`firstName: ${profile.personalData.firstName}`);
      }
      if (profile.personalData.occupation) {
        documentData.push(`occupation: ${profile.personalData.occupation}`);
      }
      if (profile.personalData.address) {
        documentData.push(`address: ${profile.personalData.address}`);
      }
      if (profile.personalData.phone) {
        documentData.push(`phone: ${profile.personalData.phone}`);
      }
      if (profile.personalData.email) {
        documentData.push(`email: ${profile.personalData.email}`);
      }
      
      if (documentData.length > 0) {
        contextParts.push('Данные для документов:');
        documentData.forEach(data => {
          contextParts.push(`- ${data}`);
        });
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

  // Расчет стоимости использования WindexAI
  calculateCost(usage) {
    if (!usage) return 0;
    
    // Примерные цены для WindexAI (нужно уточнить актуальные)
    const inputPricePer1K = 0.0005;  // $0.0005 за 1K input tokens
    const outputPricePer1K = 0.0015; // $0.0015 за 1K output tokens
    
    const inputCost = (usage.prompt_tokens || 0) / 1000 * inputPricePer1K;
    const outputCost = (usage.completion_tokens || 0) / 1000 * outputPricePer1K;
    
    return Math.round((inputCost + outputCost) * 10000) / 10000; // Округляем до 4 знаков
  }
}

module.exports = new ChatService(); 