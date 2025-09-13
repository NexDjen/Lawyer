const axios = require('axios');
const logger = require('../utils/logger');

const WINDEXAI_API_KEY = process.env.WINDEXAI_API_KEY;
const WINDEXAI_TTS_URL = 'https://api.windexai.com/v1/audio/speech';

async function synthesizeSpeech(text, {
  voice = 'nova',
  model = 'tts-1',
  languageCode = 'ru',
  response_format = 'mp3',
  speed = 1.0
} = {}) {
  if (!WINDEXAI_API_KEY) {
    logger.error('WINDEXAI_API_KEY is not set');
    throw new Error('WINDEXAI_API_KEY is not set');
  }
  
  logger.info('TTS request:', { textLength: text.length, voice, model });
  
  const payload = {
    model,
    input: text,
    voice,
    response_format,
    speed
  };
  const headers = {
    'Authorization': `Bearer ${WINDEXAI_API_KEY}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await axios.post(WINDEXAI_TTS_URL, payload, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30000, // 30 секунд таймаут
      httpsAgent: new (require('https').Agent)({
        keepAlive: true,
        timeout: 30000
      })
    });
    
    logger.info('TTS response received, size:', response.data.length);
    return response.data; // Buffer (mp3)
  } catch (error) {
    logger.error('TTS API error:', error.response?.data || error.message);
    // Если TTS не работает, возвращаем null вместо ошибки
    logger.warn('TTS failed, continuing without audio');
    return null;
  }
}

module.exports = { synthesizeSpeech };