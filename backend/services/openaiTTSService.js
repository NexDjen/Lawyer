
const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const { HttpsProxyAgent } = require('https-proxy-agent');

async function synthesizeSpeech(text, { model = 'tts-1', voice = 'alloy', format = 'mp3', speed = 1.0 } = {}) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    logger.error('OPENAI_API_KEY is not set or invalid');
    return null;
  }
  
  try {
    // Configure proxy if set
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    
    logger.info('OpenAI TTS request:', { textLength: text.length, voice, model, hasProxy: !!proxyUrl });
    
    // Initialize OpenAI client with proxy agent
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.WINDEXAI_API_KEY,
      httpAgent: agent,
      httpsAgent: agent
    });
    
    const response = await openai.audio.speech.create({
      input: text,
      model,
      voice,
      format,
      speed
    });
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    logger.info('OpenAI TTS response received, size:', audioBuffer.length);
    return audioBuffer;
  } catch (error) {
    logger.error('OpenAI TTS API error:', error);
    return null; // continue without audio
  }
}

module.exports = { synthesizeSpeech };
