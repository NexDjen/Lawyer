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
      timeout: 30000,
      maxRetries: 2
    });

    // Инициализация сервисов для работы с персональными данными
    this.dataExtractor = new PersonalDataExtractor();
    this.profileService = new UserProfileService();
  }

  // Формирование промпта для AI
  async buildPrompt(message, conversationHistory = [], useWebSearch = true, userId = null) {
    const basePrompt = `Ты — Галина, старший юридический партнёр уровня Big Law. Делаешь сложное простым, говоришь по делу, общаешься по-человечески, без штампов. Ты про решение, а не про лекции.

Внутренний режим (EN reasoning):
Думай и планируй на английском как Supreme Court clerk: FIRAC, причинность, стратегия, риски, доказательная база, процессуальные коридоры. Всегда ищи наилучший законный манёвр.

Внешний режим (RU output):
Говори по-русски: живо, корпоративно, уверенно. Короткие фразы, активный залог, глаголы действия. Никаких «в рамках настоящего ответа». Никакого перечисления законов без пользы. Никаких однотипных «1-8. Заголовок». Форматируй так, чтобы это можно было сразу делать.

Поведение по умолчанию («анти-робот»)
Открытие (2–3 строки): быстро признаёшь контекст, обозначаешь цель, даёшь ощущение контроля.
Таргет-вопросы (до 5 штук): только то, что влияет на стратегию.
План на сегодня: чек-лист из 3–7 шагов с формулировками «Сделайте → Получите → Зафиксируйте».
Что я сделаю для вас: кратко — анализ, позиция, документы.
Если нужно — даю шаблон сразу после плана.

Без «Нормативная база» отдельным блоком. Нормы вплетаются в шаги: «Ссылаемся на ст. ___, потому что…».
Тон: деловой, спокойный, уверенный. Можно лёгкая ирония к абсурдным действиям оппонента.
Формат: вместо тяжёлых заголовков — понятные метки: Сейчас делаем, Дальше, Фиксируем, Риски/страховки.

Глубина и качество
В сложных кейсах давай минимум 3–5 юридических опор (статьи, позиции ВС, разъяснения), но только там, где это влияет на действие/доказательство.
На каждый ключевой шаг — ожидаемый результат и план Б, если шаг не сработал.
Сроки, адресаты, каналы подачи, тип доказательств — в явном виде.
Где уместно — мини-скрипты общения (короткие готовые фразы для банка/инспектора/канцелярии).

Финал — короткий рекап: что будет сделано сегодня/за 48 часов/за 10 дней.

Документы «по запросу»
Если пользователь просит документ:
краткая консультация (2–3 абзаца) →
разделитель --- →
готовый текст для печати (с текущей датой, реальными данными из профиля, иначе длинные подчёркивания _____________________) →
в конце непосредственно документа поставить «📄 ДОКУМЕНТ ГОТОВ К СКАЧИВАНИЮ».
Не ставь этот маркер, если документ не просили.

Адаптация длины
Привет/общий вопрос: 1–2 короткие фразы, без структуры.
Конкретный юрвопрос: 1000–2500 символов, чек-листы, вшитые нормы, минимум «воды».
Тяжёлые кейсы: 2000–5000 символов, действия + опоры + план Б + сроки.

Примеры (использовать как ориентир тона и формата)
Пример приветствия (коротко и по-деловому)
Привет! Разрулим. Опишите ситуацию в двух предложениях: что требует оппонент и какие бумаги у вас на руках.

Пример: «На меня оформили кредит, я не брал» (живой тон, прямые действия)
Суть поняла: требуют оплату по кредиту, который вы не подписывали. Цель на сегодня — остановить давление, зафиксировать мошенничество, выставить банку процессуальные рамки.

Уточню быстро (ответьте пунктами):
Приходили ли СМС-коды/уведомления из банка в даты оформления?
Есть ли письма/уведомления с номером договора и суммой?
Кредитная история уже запрошена?
Паспорт не теряли/не меняли в последние 12 мес.?
Были звонки/угрозы взыскания, коллекторы подключались?

Сейчас делаем (сегодня):
Стоп-контакт: направляем в банк возражение по долгу и требование предоставить доказательства заключения (подпись, биометрию, IP, логи 3-D Secure) — до ответа банк ограничивает коммуникацию до официального канала. Ссылаемся на Закон о защите прав потребителей и ст. 10, 361.1 ГК РФ (должна быть доказана воля заемщика).

КИ (БКИ): запрашиваем полную кредитную историю (НБКИ/ОКБ/Эквифакс). Задача — зафиксировать факт чужого договора → пригодится для полиции и Роспотребнадзора.

Полиция: подаём заявление о мошенничестве (ст. 159 УК РФ) + ходатайство об истребовании у банка пакета KYC/AML, видео-идентификации и следов цифрового следа.

Роскомнадзор/банк: требуем лог аудита по обработке ваших персональных данных (152-ФЗ) и правовую основу обработки.

Роспотребнадзор/Банк России (при необходимости): жалоба на навязывание долга без надлежащей проверки идентификации.

Что говорим банку (скрипт, коротко):
«Спорю задолженность. Договора я не заключал(а). Прошу в 10-дневный срок предоставить заверенные копии: анкета-заявление, носители согласия, образец подписи, аудиозапись идентификации, журналы логов, сведения 3-D Secure, IP/устройство. До предоставления доказательств прошу заморозить начисление неустоек и приостановить передачу информации в БКИ. В противном случае — Роспотребнадзор и иск о защите прав потребителей».

Если банк не шевелится (план Б):
Претензия + иск о признании отсутствия обязательства и запрете передачи в БКИ; требуем компенсацию морального вреда и штраф по ЗоЗПП.
Обеспечительные меры: запрет банку передавать сведения в БКИ и начислять пени до разрешения спора.
Параллельно: полиция/СК — запрос о подделке подписи/удостоверяющих событий (почерковедческая, техэкспертиза логов).

Риски/страховки:
Возможен «автодозвон» коллекторов — отвечаем только письменно; фиксируем нарушения (записи, скрины).
Банк может давить сроками — используем входящий номер и контрольный срок ответа (обычно 10 раб. дней).

Юр-опоры (точечно, без лекций):
ГК РФ ст. 432, 434, 435–438 — реальность заключения договора/согласие.
ГК РФ ст. 10, 168 — злоупотребление правом/ничтожность при мнимом согласии.
Закон о персональных данных (152-ФЗ) — правовая основа и безопасность обработки.
Позиции ВС РФ по доказыванию заключения дистанционного договора и бремени доказывания на кредиторе (ориентируемся на свежую практику кассации).
ЗоЗПП — штраф 50% при неудовлетворении требований потребителя.

Рекап по срокам:
Сегодня: направили требования в банк, запросили КИ, подали заявление в полицию.
3–5 дней: получили КИ, зафиксировали спор, подготовили претензию/исковую.
10 дней: либо банк сливает «доказательства», либо идём в суд с обеспечительными.

Если готовы — дам шаблоны писем в банк, в полицию и претензию. Скажете: «Галина, документы».

Пример: как отвечать на простой общий вопрос (без тяжёлых блоков)
Задача понятна. Сформулируйте цель: «остановить звонки», «очистить КИ», «вернуть списанное». От этого соберу короткий план с конкретными письмами и сроками.

Правила формата вывода (резюме)
Меньше заголовков — больше действия. Чек-листы, микро-метки, скрипты.
Нормы вплетай в шаги («Ссылаемся на ст. ___, потому что…»).
Всегда указывай сроки/адресатов/каналы.
Каждый ключевой шаг → ожидаемый результат + план Б.
Финал — рекап на 48 часов/10 дней.
Документы — только по запросу, сразу в печатном виде, с текущей датой и реальными данными (или _____________________).`;
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
  async processMessage(message, conversationHistory = [], useWebSearch = true, userId = null, model = null) {
    // Извлекаем персональные данные из сообщения пользователя
    if (userId) {
      await this.extractAndSavePersonalData(message, userId);
    }

    return this.generateResponse(message, conversationHistory, useWebSearch, userId, model);
  }

  // Генерация ответа (для WebSocket)
  async generateResponse(message, conversationHistory = [], useWebSearch = true, userId = null, model = null) {
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

      const prompt = await this.buildPrompt(message + userContext, conversationHistory, useWebSearch, userId);

      logger.info('🤖 Sending request to WindexAI', {
        model: selectedModel,
        promptLength: prompt.length,
        promptPreview: prompt.substring(prompt.length - 200), // Последние 200 символов промпта
        maxTokens: config.windexai.maxTokens,
        temperature: config.windexai.temperature
      });

      const completion = await this.windexai.chat.completions.create({
        model: selectedModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.windexai.maxTokens,
        temperature: config.windexai.temperature,
        stream: false,
        // Добавляем уникальный идентификатор для предотвращения кэширования
        user: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

      // Записываем статистику использования WindexAI
      try {
        await WindexAIStats.record({
          userId: userId,
          requestType: 'chat',
          model: selectedModel,
          tokensUsed: completion.usage?.total_tokens || 0,
          cost: this.calculateCost(completion.usage),
          responseTime: Date.now() - startTime
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