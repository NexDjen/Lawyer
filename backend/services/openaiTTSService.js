
const { OpenAI } = require('openai');
const logger = require('../utils/logger');

async function synthesizeSpeech(text, { model = 'tts-1', voice = 'alloy', format = 'mp3', speed = 1.0 } = {}) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    logger.error('OPENAI_API_KEY is not set or invalid');
    return null;
  }
  
  try {
    // Инициализируем клиент только при необходимости
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    logger.info('OpenAI TTS request:', { textLength: text.length, voice, model });
    const response = await openai.audio.speech.create({
      input: text,
      model,
      voice,
      format,
      speed
    });
    // Возвращаем буфер аудио в формате mp3
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    logger.info('OpenAI TTS response received, size:', audioBuffer.length);
    return audioBuffer;
  } catch (error) {
    logger.error('OpenAI TTS API error:', error);
    // Передаем null, чтобы продолжить без аудио
    return null;
  }
}

module.exports = { synthesizeSpeech };
