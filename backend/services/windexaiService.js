const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class WindexAIService {
  constructor() {
    this.apiKey = config.windexai.apiKey;
    this.model = config.windexai.model;
    this.maxTokens = config.windexai.maxTokens;
    this.temperature = config.windexai.temperature;
    
    if (!this.apiKey) {
      throw new Error('WindexAI API key is required');
    }
  }

  async generateResponse(messages, options = {}) {
    try {
      logger.debug('Sending request to WindexAI', {
        model: this.model,
        messageCount: messages.length,
        maxTokens: options.maxTokens || this.maxTokens
      });

      const response = await axios.post(
        'https://api.windexai.com/v1/chat/completions',
        {
          model: this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      const content = response.data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from WindexAI');
      }

      logger.debug('WindexAI response received', {
        contentLength: content.length,
        usage: response.data.usage
      });

      return {
        content,
        usage: response.data.usage,
        model: response.data.model
      };

    } catch (error) {
      logger.error('WindexAI API error', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      if (error.response?.status === 401) {
        throw new Error('Invalid WindexAI API key');
      } else if (error.response?.status === 429) {
        throw new Error('WindexAI API rate limit exceeded');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('WindexAI API request timeout');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to WindexAI API - network error');
      }

      throw new Error(`WindexAI API error: ${error.message}`);
    }
  }

  async generateLegalResponse(userMessage, context = {}) {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    return this.generateResponse(messages);
  }

  buildSystemPrompt(context = {}) {
    const { userDocumentsData = {}, webSearchResults = null } = context;
    
    let prompt = `Ты - опытный юрист-консультант с глубокими знаниями российского законодательства. 
Твоя задача - предоставлять точные, полезные и понятные юридические консультации.

Основные принципы:
1. Всегда ссылайся на конкретные статьи законов
2. Объясняй сложные юридические термины простым языком
3. Предлагай практические решения
4. Указывай на возможные риски и альтернативы
5. Если информация недостаточна, проси уточнения

${userDocumentsData ? `ДАННЫЕ КЛИЕНТА ИЗ ДОКУМЕНТОВ: ${JSON.stringify(userDocumentsData)}` : ''}

${webSearchResults ? `АКТУАЛЬНАЯ ИНФОРМАЦИЯ: ${webSearchResults}` : ''}

АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ДОКУМЕНТОВ:
- Если пользователь просит создать документ или ты понимаешь, что ему нужен документ, генерируй его полностью
- Используй данные из загруженных документов для заполнения полей
- Если данных нет, используй плейсхолдеры с подчеркиваниями (например: [ФИО])
- После генерации документа предлагай скачать DOCX версию
- Поддерживаемые типы: договоры, жалобы, заявления, претензии, иски

Отвечай на русском языке, будь профессиональным, но дружелюбным.`;

    return prompt;
  }
}

module.exports = new WindexAIService(); 