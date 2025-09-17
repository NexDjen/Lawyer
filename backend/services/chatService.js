const WindexAI = require('openai'); // WindexAI API client
const config = require('../config/config');
const logger = require('../utils/logger');
const { readDb } = require('./documentStorage');

class ChatService {
  constructor() {
    this.windexai = new WindexAI({
      apiKey: config.windexai.apiKey,
    });
  }

  // Формирование промпта для AI
  buildPrompt(message, conversationHistory = [], useWebSearch = true) {
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
    const personalization = '\n\nЕсли в пользовательских документах есть ФИО (Имя, Отчество, Фамилия) — обращайся к пользователю по Имени и Отчеству. В ответах опирайся на факты из документов пользователя (OCR поля/текст), явно указывай ключевые выдержки, если они релевантны.';

    const webSearchContext = useWebSearch 
      ? '\n\nИспользуй актуальную информацию из интернета для более точных ответов.'
      : '\n\nОтвечай только на основе базовых знаний, без веб-поиска.';

    return `${basePrompt}${personalization}${historyContext}${webSearchContext}\n\nВопрос: ${message}\n\nОтвет:`;
  }

  // Обработка сообщения через WindexAI
  async processMessage(message, conversationHistory = [], useWebSearch = true) {
    return this.generateResponse(message, conversationHistory, useWebSearch);
  }

  // Генерация ответа (для WebSocket)
  async generateResponse(message, conversationHistory = [], useWebSearch = true) {
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
      let userContext = '';
      try {
        const db = await readDb();
        const lastItems = (db.items || []).filter(i => i.kind === 'ocr').slice(-10).reverse();
        if (lastItems.length > 0) {
          const blocks = lastItems.map((it, idx) => {
            const fields = it.extractedData ? JSON.stringify(it.extractedData) : '';
            const text = it.recognizedText ? (it.recognizedText.substring(0, 1500)) : '';
            return `Документ ${idx + 1} [тип: ${it.documentType || 'unknown'}]:\nПоля: ${fields}\nТекст: ${text}`;
          });
          userContext = `\n\nПользовательские документы:\n${blocks.join('\n\n')}`;
        }
      } catch (e) {
        logger.warn('Failed to load user documents context', { error: e.message });
      }

      const prompt = this.buildPrompt(message + userContext, conversationHistory, useWebSearch);

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
}

module.exports = new ChatService(); 