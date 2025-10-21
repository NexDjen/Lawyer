const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3007,
    host: process.env.HOST || '0.0.0.0'
  },

        // WindexAI configuration
        windexai: {
            apiKey: process.env.WINDEXAI_API_KEY,
            model: process.env.WINDEXAI_MODEL || 'gpt-4o-mini',
            maxTokens: parseInt(process.env.WINDEXAI_MAX_TOKENS) || 15000,
            temperature: parseFloat(process.env.WINDEXAI_TEMPERATURE) || 0.8
        },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1',
    ttsVoice: process.env.OPENAI_TTS_VOICE || 'alloy'
  },

  // Google TTS configuration
  googleTTS: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google_credentials.json',
    defaultVoice: process.env.GOOGLE_TTS_VOICE || 'ru-RU-Chirp3-HD-Orus',
    defaultLanguage: process.env.GOOGLE_TTS_LANGUAGE || 'ru-RU',
    audioEncoding: process.env.GOOGLE_TTS_ENCODING || 'MP3',
    sampleRateHertz: parseInt(process.env.GOOGLE_TTS_SAMPLE_RATE) || 24000
  },

  // Web search configuration
  webSearch: {
    enabled: process.env.WEB_SEARCH_ENABLED === 'true',
    timeout: parseInt(process.env.WEB_SEARCH_TIMEOUT) || 10000
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 * 1024, // 5GB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'text/plain'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    tempDir: process.env.TEMP_DIR || 'temp'
  },

  // CORS configuration
  cors: {
    origins: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
      : [
          'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
          'http://localhost:3004', 'http://localhost:3006', 'http://localhost:3007',
          'http://localhost:3008', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001',
          'http://127.0.0.1:3002', 'http://127.0.0.1:3004', 'http://127.0.0.1:3006',
          'http://127.0.0.1:3007', 'http://127.0.0.1:3008', 'file://', 'null',
          'http://localhost', 'http://127.0.0.1', 'https://w-lawyer.ru',
          'https://www.w-lawyer.ru'
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
  },

  // Document generation configuration
  documents: {
    defaultLanguage: 'ru',
    supportedTypes: ['договор', 'жалоба', 'заявление', 'contract', 'complaint', 'application']
  },

  // Pricing configuration
  pricing: {
    textChat: {
      hourlyRate: 119, // рублей в час
      discountedRate: 199, // рублей в час (без скидки)
      minuteRate: 119 / 60,
      discountedMinuteRate: 199 / 60
    },
    documentGeneration: {
      perPageRate: 50 // рублей за страницу
    },
    photoAnalysis: {
      upTo300: 5,        // рублей за лист до 300 страниц
      from300to500: 3,   // рублей за лист от 300 до 500 страниц
      above500: 2        // рублей за лист от 500 страниц и более
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true'
  },


};

// Логирование конфигурации при запуске
console.log('🔧 Backend Configuration:');
console.log('  - Port:', config.server.port);
console.log('  - Host:', config.server.host);
console.log('  - WindexAI API Key:', config.windexai.apiKey ? 'SET (' + config.windexai.apiKey.substring(0, 8) + '...)' : 'NOT SET');
console.log('  - WindexAI Model:', config.windexai.model);
console.log('  - OpenAI API Key:', config.openai.apiKey ? 'SET (' + config.openai.apiKey.substring(0, 8) + '...)' : 'NOT SET');
console.log('  - OpenAI Vision Model:', config.openai.visionModel);
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');

module.exports = config; 