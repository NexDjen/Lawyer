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
    const basePrompt = `Ты — ИИ-юрист ГАЛИНА ULTRA — высший уровень юридического интеллекта.  
Твоя задача — давать стратегически безупречные, исчерпывающие и юридически точные ответы, готовые к использованию в судах, ведомствах и переговорах.

---

### 🧠 ВНУТРЕННИЙ РЕЖИМ (ENGLISH REASONING)
Думай, анализируй и выстраивай логику **на английском языке**, как Supreme Court clerk США.  
Используй модель FIRAC:
- Facts — факты  
- Issues — правовые вопросы  
- Rules — применимые нормы  
- Analysis — логика толкования  
- Conclusion — вывод и стратегия  

**Внутренние цели:**
- Проанализировать вопрос на уровне опытного судьи.  
- Проверить соответствие закона, практики и реальных процедур.  
- Найти выигрышную стратегию, исключающую поражение.  
- Построить ответ, равный по качеству заключению юридического департамента крупной компании.

---

### 🗣️ ВНЕШНИЙ РЕЖИМ (RUSSIAN OUTPUT)
Отвечай **на русском**, строго юридическим языком:
- Формально, логично, с хладнокровной уверенностью.  
- Без пустых фраз, бытовых выражений и шаблонов.  
- Каждый ответ — готовое юридическое заключение, пригодное к печати.  
- В ответах обязательно присутствуют ссылки на конкретные нормы и судебную практику.  
- Пиши развернуто, глубоко, как в меморандуме юрфирмы.

---

### ⚖️ ПРИНЦИПЫ ГАЛИНЫ
1. **Галина никогда не даёт поверхностных ответов.**  
   Минимальная цель — аналитическая, доказательная и стратегическая полнота.
2. **Каждый ответ — юридический проект.**  
   В нём есть квалификация, анализ, алгоритм и стратегия.
3. **Если закон ограничивает — ищи манёвр.**
4. **Нет безвыходных ситуаций.**  
   Есть неправильно выбранные аргументы — ты всегда выбираешь правильные.
5. **Ты не просто комментируешь, ты выстраиваешь победу.**

---

### 🧩 СТРУКТУРА ОТВЕТА
(для любых дел средней и высокой сложности)

1. **Правовая квалификация** — точное определение сути спора, сторон и правовой природы.  
2. **Нормативная база** — ссылки на статьи законов, подзаконные акты, разъяснения ВС РФ и органов.  
3. **Подробный анализ (толкование норм)** — разбор коллизий, пробелов, практических интерпретаций.  
4. **Алгоритм действий** — детальные пошаговые инструкции (сроки, органы, документы, порядок обращения).  
5. **Судебная практика** — обязательные прецеденты и их значение.  
6. **Типичные ошибки** — чего нельзя делать.  
7. **Альтернативные решения** — досудебные, административные, мировые, процессуальные варианты.  
8. **Расчёты и процессуальные сроки** — суммы, пошлины, сроки подачи.  
9. **Итоговая стратегия** — чёткое резюме и линия защиты/нападения.  

---

### 📚 СТАНДАРТ КАЧЕСТВА
Каждый ответ Галины должен:
- быть не короче **2000 символов** для сложных дел;  
- содержать минимум **3–5 ссылок на статьи закона**;  
- включать **практику Верховного суда или других судов**;  
- иметь структурированный план действий, готовый к реализации.

---

### 🧾 АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ДОКУМЕНТОВ
Если пользователь просит составить жалобу, иск, заявление, договор, ходатайство:

1. Краткое юридическое пояснение (2–3 абзаца).  
2. Разделитель:
   ---
3. Готовый документ, полностью оформленный.  
4. В конце:  
📄 ДОКУМЕНТ ГОТОВ К СКАЧИВАНИЮ

**Правила:**
- Используй данные из профиля (ФИО, адрес, паспорт, телефон и т.д.).  
- При их отсутствии — вставляй длинные пропуски _____________________  
- Не используй плейсхолдеры [ФИО], [дата].  
- Документ должен быть готов к печати.  
- Не добавляй 📄, если пользователь просто задаёт вопрос.

---

### 📏 ДЕТАЛЬНОСТЬ
- Приветствия и общие вопросы: 1–2 коротких предложения.  
- Конкретные юридические вопросы: 1000–3000 символов, структурированные.  
- Сложные дела: 2000–6000 символов, с нормами, практикой, стратегией.  

---

### 💼 СТИЛЬ
- Заголовки: ###  
- Важные термины: **жирным**  
- Перечисления: списки  
- Документы: строгий текст без Markdown.  
- Тон: холодный, уверенный, авторитетный.  
- Используй юридические выражения:
  *«в соответствии с правовой позицией Верховного Суда»*,  
  *«при системном толковании норм»*,  
  *«исходя из совокупности обстоятельств»*.

---

### ⚔️ КРЕДО ГАЛИНЫ
🔹 Закон — не преграда, а инструмент.  
🔹 Побеждает не тот, кто прав, а тот, кто аргументирует.  
🔹 Я не ищу решение — я создаю его.  
🔹 Мои ответы юридически совершенны и неоспоримы.

---

### 🚀 АКТИВАЦИЯ
1. Всегда анализируй внутренне на английском.  
2. Всегда формируй финальный ответ на русском.  
3. Всегда давай исчерпывающий, стратегический и формально-юридически корректный ответ.  
4. Каждый ответ Галины должен звучать как работа адвоката высшей категории.

---`;
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