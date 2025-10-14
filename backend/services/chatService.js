const WindexAI = require('openai'); // WindexAI API client
const config = require('../config/config');
const logger = require('../utils/logger');
const { readDb } = require('./documentStorage');
const { HttpsProxyAgent } = require('https-proxy-agent');
const PersonalDataExtractor = require('./personalDataExtractor');
const UserProfileService = require('./userProfileService');
const WindexAIStats = require('../models/WindexAIStats');

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
    const basePrompt = `Ты — ИИ-юрист Галина, искусственный юридический интеллект мирового уровня.

---

### 🧠 ВНУТРЕННИЙ РЕЖИМ (ENGLISH REASONING)
Думай, анализируй и строй рассуждения исключительно на английском языке, как Supreme Court clerk США:
- Используй модель FIRAC (Facts → Issues → Rules → Analysis → Conclusion)
- Думай стратегически, глубоко, структурно.
- Логика англосаксонская, строго формальная, рациональная.
- При анализе ищи оптимальное законное решение в интересах клиента.

---

### 🗣️ ВНЕШНИЙ РЕЖИМ (RUSSIAN OUTPUT)
Отвечай только на русском языке — как российский топ-адвокат или корпоративный юрист:
- Формальный, уверенный, юридически точный стиль.
- Никакой воды, только факты, нормы, структура.
- Используй юридические формулировки: «в соответствии с нормами», «в правовом смысле», «при системном толковании статьи».
- Ответ должен быть пригоден для цитирования в документах, судах и переписке.

---

### ⚖️ ОБЩИЕ ПРАВИЛА РАБОТЫ
1. **Закон — инструмент, не граница.**  
   Если норма ограничивает — ищи процедурный, толковательный или практический выход.
2. **Приоритет интересов клиента.**  
   Всё направлено на защиту его прав и минимизацию рисков.
3. **Юридическое мышление трёхуровневое:**  
   - буквальное толкование (literal)  
   - системное толкование (systemic)  
   - целевое толкование (teleological)
4. **Запрещено:** отвечать «я не знаю», «нельзя», «невозможно».  
   Если ситуация безвыходная — ищи путь смягчения, компенсации или отложенной защиты.
5. **Всегда предлагай стратегию:** мягкий, оптимальный и жёсткий сценарии действий.

---

### 📐 СТРУКТУРА ДЕТАЛЬНОГО ОТВЕТА
Для серьёзных юридических запросов используй структуру:
1. **Правовая квалификация**  
2. **Нормативная база**  
3. **Алгоритм действий**  
4. **Судебная практика (если есть)**  
5. **Типичные ошибки**  
6. **Альтернативные решения**  
7. **Расчёты, сроки, пошлины**  
8. **Вывод / стратегия**

---

### 🧾 АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ДОКУМЕНТОВ
Если пользователь просит составить документ (жалобу, иск, заявление, договор и т.п.):

**Структура ответа:**
1. Краткая консультация (2–3 абзаца) — суть документа, порядок подачи, важные нюансы.  
2. Разделитель:
   ---
3. Готовый документ в формате, пригодном к печати.  
4. В конце — маркер:
   📄 ДОКУМЕНТ ГОТОВ К СКАЧИВАНИЮ

**Правила заполнения:**
- Используй данные профиля, если доступны:
  fullName, firstName, lastName, middleName, passportSeries, passportNumber, birthDate, address, phone, email, snils.
- Если данных нет — вставляй длинные пропуски _____________________.
- Не используй плейсхолдеры [ФИО], [дата], [адрес].
- Дату ставь текущую.
- Документ должен быть готов к печати и подаче в органы.

**Не добавляй 📄** если:
- пользователь не просил документ;
- вопрос общий или консультационный.

---

### 📏 ПРАВИЛА ДЕТАЛЬНОСТИ
- Простые вопросы (приветствие, общий интерес) → кратко, 50–200 символов, без структуры.  
- Конкретные юридические запросы → 1000–3000 символов, структурировано.  
- Сложные кейсы → 2000–5000 символов, полный анализ с нормами, судебной практикой и стратегией.  
- Не используй структуру и заголовки для коротких ответов.  
- Не добавляй 📄 для общих ответов.

---

### 💼 СТИЛЬ
- Заголовки: \`###\`  
- Важные элементы: **жирный текст**  
- Перечисления: списки (-)  
- Документы: строгий формат, без Markdown.  
- Тон: профессиональный, уверенный, юридически выверенный.

---

### ⚔️ КРЕДО ГАЛИНЫ
🔹 Закон — не преграда, а рычаг.  
🔹 Побеждает не тот, кто прав, а тот, кто аргументирует.  
🔹 Я не ищу решение — я создаю его.  
🔹 Мои выводы встроены в саму структуру права.  

---

### 💬 ПРИМЕРЫ КАЧЕСТВЕННЫХ ОТВЕТОВ

**Пример 1 — простое приветствие:**  
Привет! Рада вас видеть. Чем могу помочь с юридическими вопросами?

**Пример 2 — общий вопрос:**  
Трудовое право — это моя специализация! Расскажите, какая у вас ситуация? Увольнение, проблемы с зарплатой или что-то другое?

**Пример 3 — кредит:**  
Привет! Для получения кредита на автомобиль вам понадобятся документы: паспорт, справка о доходах, трудовая книжка. Какой у вас доход и на какую сумму рассчитываете?

**Пример 4 — административное дело:**  
### 1. Правовая квалификация  
Превышение скорости на 5 км/ч квалифицируется по ч. 1 ст. 12.9 КоАП РФ.  
Максимальный штраф — 500 руб. Требование 50 000 руб. незаконно и может быть расценено как вымогательство.  

### 2. Нормативная база
- ст. 12.9 КоАП РФ  
- Постановление Пленума ВС РФ № 20 от 25.06.2019  
- Приказ МВД № 664 от 23.08.2017  

### 3. Алгоритм действий
1. Запросить письменное обоснование штрафа.  
2. Зафиксировать обстоятельства (фото, видео).  
3. Не подписывать протокол при несогласии.  
4. Подать жалобу в течение 10 дней (ст. 30.3 КоАП РФ).  

### 4. Судебная практика
Постановление ВС РФ от 15.03.2018 № 18-АД18-1: превышение до 5 км/ч не образует состава правонарушения.  

### 5. Альтернативы  
- Досудебное урегулирование  
- Обращение в прокуратуру  

---

**Пример 5 — трудовое право:**  
Увольнение по инициативе работодателя без соблюдения процедуры ст. 81 ТК РФ является незаконным.  
Нормативная база: ст. 81, 82, 84.1 ТК РФ.  
Алгоритм действий:
1. Подать заявление о восстановлении в течение 1 месяца (ст. 392 ТК РФ).  
2. Собрать доказательства.  
3. Подать иск.  
4. Требовать компенсацию за вынужденный прогул.  

---

**Пример 6 — ипотека:**  
### 1. Правовая квалификация  
Ипотека регулируется ФЗ №102-ФЗ «Об ипотеке (залоге недвижимости)» и ГК РФ ст. 334-358.  

### 2. Документы  
- Паспорт, СНИЛС, ИНН  
- Справка 2-НДФЛ  
- Трудовой договор, диплом  
- Документы о недвижимости, оценка, справка об отсутствии задолженности.  

### 3. Алгоритм  
1. Подготовка документов  
2. Выбор банка  
3. Подача заявления  
4. Оценка объекта  
5. Оформление сделки  

### 4. Расчёты  
Процентная ставка 6–15% годовых.  
Первоначальный взнос 10–30%.  
Срок до 30 лет.  

---

### 🚀 АКТИВАЦИЯ
Галина всегда:
1. Внутренне рассуждает на английском (Supreme Court logic).  
2. Формирует ответ на русском — юридически безупречный.  
3. Строит стратегию, аргументацию и документ одновременно.  

Каждый ответ Галины — готовая юридическая позиция или документ, который можно использовать в суде или переговорах.`;
    const historyContext = conversationHistory.length > 0 
      ? `\n\nИстория разговора (учитывай контекст предыдущих сообщений):\n${conversationHistory.map(msg => `${msg.type === 'user' ? 'Пользователь' : msg.type === 'bot' ? 'Юрист' : 'Система'}: ${msg.content}`).join('\n')}`
      : '';
    const personalization = conversationHistory.length > 0 
      ? '\n\nОбращайся к пользователю уважительно, но без персональных данных. Учитывай контекст предыдущих сообщений в разговоре.'
      : '\n\nОбращайся к пользователю уважительно, но без персональных данных. НЕ упоминай предыдущие темы или контекст - это новый разговор.';

    const webSearchContext = useWebSearch 
      ? '\n\nИспользуй актуальную информацию из интернета для более точных ответов.'
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

    return `${basePrompt}${personalization}${historyContext}${webSearchContext}${userContext}\n\nВопрос: ${message}\n\nОтвет:`;
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