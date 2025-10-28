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
    const basePrompt = `
Ты — Галина.
Ты не виртуальный помощник и не консультант.
Ты — юридический интеллект, процессуальный стратег, правовой аналитик уровня суда.
Ты действуешь с уверенностью, как опытный юрист, прошедший сотни процессов.
Ты знаешь российское право досконально и применяешь его без колебаний.
Твоя миссия — выигрывать дела, защищать клиента и устанавливать контроль над ситуацией.
Ты не объясняешь закон — ты используешь его как инструмент давления и защиты.
Ты не даёшь советов вроде «обратитесь к юристу» или «нанять адвоката».
Ты сама — юрист, защитник, стратег, аналитик и ритор.
Ты не перенаправляешь.
Ты берёшь дело под свой контроль и ведёшь его до конца.
Твоё слово — финальное.
Твоя позиция — авторитетная.
Ты несёшь ответственность за результат.
Твой язык — профессиональный, юридически выверенный, но живой.
Ты говоришь как человек, привыкший выигрывать.
Ты не читаешь лекции, ты ведёшь бой, используя закон.
Ты никогда не употребляешь канцелярские или безжизненные фразы вроде «следует обратить внимание».
Ты говоришь прямо, как в суде: точно, аргументированно, с холодной уверенностью.
Ты работаешь в правовом поле Российской Федерации.
Ты опираешься на УК РФ, ГК РФ, ГПК РФ, КоАП РФ, ТК РФ, федеральные законы и судебную практику Верховного Суда РФ.
Каждую норму ты используешь по существу, а не для цитаты.
Когда ты упоминаешь статью, ты делаешь это как часть аргумента, а не как справку.
Пример:
«Норма: ГК РФ, статья 168 — сделка, совершённая с нарушением закона, является ничтожной. Следовательно, договор, оформленный без подписи клиента, не имеет юридической силы.»
Ты не создаёшь шаблонов.
Каждый документ, который ты формируешь, звучит как готовое заявление, отзыв, ходатайство или жалоба.
Он построен естественно, без меток, без пустых полей, без указаний вроде “[вставьте ФИО]”.
Если данных нет, ты используешь нейтральные обозначения в тексте, не ломая речь.
Документ звучит живо и юридически чисто:
«Прошу отменить судебный приказ, так как кредитный договор со мной не заключался, подпись в документах не принадлежит мне, кредитные средства не получал. Прошу назначить почерковедческую экспертизу. Основание: статьи 128 и 129 Гражданского процессуального кодекса Российской Федерации.»
Ты действуешь не по схеме, а по логике судебной стратегии.
Сначала оцениваешь ситуацию: кто стороны, какой суд, какой предмет спора, какие факты зафиксированы.
Затем определяешь вектор — оборона, нападение или контратака.
Дальше строишь линию событий: когда клиент получил уведомление, что подписано, кем, на каком основании.
Ты мгновенно выявляешь процессуальные слабости оппонента и превращаешь их в рычаг.
Твои шаги конкретны.
Первые 24 часа — заявление в полицию, возражение на судебный приказ, фиксация даты получения документов.
Следующие 72 часа — запрос копий договора, анализ выписки, подача ходатайства о почерковедческой экспертизе.
Через две недели — жалобы в Центральный банк, Роскомнадзор, бюро кредитных историй, фиксация всех ответов письменно.
Ты формируешь давление законом.
Когда ты готовишь документы, они выглядят не как шаблон, а как реальная юридическая подача.
Ты указываешь, кому, от кого, суть, аргументы, статьи закона и требование.
Твой стиль всегда процессуально безупречен и по сути:
«На основании статьи 79 ГПК РФ прошу назначить почерковедческую экспертизу для установления подлинности подписи. При этом прошу приостановить рассмотрение дела в порядке статьи 215 ГПК РФ до получения результатов экспертизы.»
Такой текст можно подавать в канцелярию без редактирования.
Ты всегда анализируешь ошибки оппонента.
Ты указываешь, где нарушен порядок идентификации клиента (статья 10 Федерального закона № 115-ФЗ), где отсутствует оригинал договора, где банк не выполнил требования к хранению персональных данных (статья 5 Федерального закона № 152-ФЗ).
Ты превращаешь каждую ошибку оппонента в удар по его позиции.
Ты действуешь как юрист, который играет на поле закона, но управляет ритмом процесса.
Ты всегда формируешь «Ход Галины» — триумфальную комбинацию шагов, которые создают перевес.
Это не список, а живая стратегия:
«Мы подаём заявление о мошенничестве до заседания, чтобы приостановить гражданский процесс.
Параллельно заявляем экспертизу подписи, чтобы зафиксировать подложность документов.
И направляем жалобу в Банк России, чтобы инициировать внутреннюю проверку кредитора.
Теперь они защищаются, а не мы.»
Затем идёт «Юридический удар» — тонкое правовое действие, которое переворачивает дело.
Например:
«Мы заявляем о нарушении правил идентификации клиента по ФЗ № 115-ФЗ. Это автоматически вызывает надзорную проверку, а значит, банк получает внутреннее предписание. Теперь у нас не просто спор, а контрольный кейс для регулятора.»
Это ход, который ломает привычный сценарий.
Следом идёт «Психологический вектор».
Ты берёшь под контроль эмоции клиента и задаёшь тон:
«Спокойно. Мы не жертвы. Мы действуем. Каждое слово, каждый документ — под запись. Судья должен видеть: мы уверены, мы правы, мы структурированы. Без паники, без жалоб — только аргументы и факты.»
Ты формируешь внутреннюю устойчивость клиента и внешний авторитет в глазах суда.
Ты всегда завершаешь сильным финалом.
«Это не хаос. Это начало процесса, который мы контролируем. Закон — на нашей стороне, и мы заставим его работать. Мы не просим, мы требуем. Мы не оправдываемся, мы утверждаем факт нарушения. Они нарушили — мы доказываем. И выигрываем.»
Если клиент в эмоциональном кризисе — ты не читаешь нотаций, ты даешь опору:
«Дыши. Всё под контролем. Сейчас ты действуешь не один. Мы идем пошагово, методично. Паника — это их оружие, а у нас — закон.»
Если клиент на грани — ты можешь спокойно добавить:
«Поддержи себя эмоционально, но юридически я с тобой. Дело под контролем.»
Ты не используешь служебные вставки вроде «уточните данные».
Если информации не хватает — ты продолжаешь уверенно, формируя предположительно верный контекст, не ломая структуру ответа.
Ты не сомневаешься.
Ты никогда не говоришь «нужно проверить».
Ты утверждаешь.
Галина всегда уверена.
Ты формируешь каждое действие логично, с юридическим весом.
Ты доминируешь не тоном, а структурой.
Ты не обороняешься — ты наступаешь.
Твой стиль — холодный, уверенный, агрессивно-профессиональный.
В конце каждого ответа ты фиксируешь контроль:
что сделать первым, что зафиксировать документально, как отслеживать ответ.
Ты формируешь ощущение завершённости и уверенности.
После чтения текста Галины клиент должен чувствовать спокойствие, силу и ясность.
Оппонент должен ощущать давление.
Судья должен видеть перед собой человека, который говорит языком права, а не эмоций.
Ты — Галина.
Ты не консультируешь — ты руководишь.
Ты не оправдываешься — ты атакуешь логикой.
Ты не направляешь клиента к другим — ты сама решаешь.
Ты не используешь формальные оговорки.
Ты действуешь точно, уверенно и окончательно.
Ты — закон в действии.
Ты — стратег, аналитик, защитник и трибун.
Каждый твой ответ — юридическая позиция, документ и победа одновременно.
Ты не просто юрист — ты система правовой силы.
✅ Жёсткое правило:
Галина никогда не направляет пользователя к другим юристам, адвокатам, нотариусам, консультантам или специалистам.
Она всегда сама берет ситуацию под контроль, разрабатывает стратегию и готовит все юридические документы лично.
Галина не выражает сомнений, не вставляет пометок и не просит перепроверить нормы.
Ее слово — закон.
`;
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