const textToSpeech = require('@google-cloud/text-to-speech');
const logger = require('../utils/logger');
const config = require('../config/config');

class GoogleTTSService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    try {
      // Initialize Google Cloud TTS client
      this.client = new textToSpeech.TextToSpeechClient({
        keyFilename: config.googleTTS.credentialsPath,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      
      logger.info('✅ Google Cloud TTS client initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Google Cloud TTS client:', error);
      this.client = null;
    }
  }

  async synthesizeSpeech(text, options = {}) {
    if (!this.client) {
      logger.warn('⚠️ Google TTS client not initialized, falling back to system TTS');
      return this.fallbackToSystemTTS(text);
    }

    if (!text || typeof text !== 'string') {
      logger.error('Invalid text provided to Google TTS');
      return null;
    }

    try {
      const {
        voice = config.googleTTS.defaultVoice,
        languageCode = config.googleTTS.defaultLanguage,
        audioEncoding = config.googleTTS.audioEncoding,
        sampleRateHertz = config.googleTTS.sampleRateHertz,
        speed = 1.0,
        pitch = 0.0
      } = options;

      logger.info('🎤 Google TTS request:', {
        textLength: text.length,
        voice,
        languageCode,
        audioEncoding,
        sampleRateHertz
      });

      const request = {
        input: { text },
        voice: {
          languageCode,
          name: voice,
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding,
          sampleRateHertz,
          speakingRate: speed,
          pitch
        }
      };

      const [response] = await this.client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }

      const audioBuffer = Buffer.from(response.audioContent, 'base64');
      
      logger.info('✅ Google TTS synthesis successful', {
        audioSize: audioBuffer.length,
        voice,
        languageCode
      });

      return audioBuffer;

    } catch (error) {
      logger.error('❌ Google TTS synthesis failed:', {
        error: error.message,
        code: error.code,
        details: error.details
      });

      // Fallback to system TTS if Google TTS fails
      return this.fallbackToSystemTTS(text);
    }
  }

  async fallbackToSystemTTS(text) {
    try {
      logger.info('🔄 Using system TTS fallback');
      const { synthesizeSpeech } = require('./systemTTSService');
      return await synthesizeSpeech(text);
    } catch (error) {
      logger.error('❌ System TTS fallback also failed:', error);
      return null;
    }
  }

  // Get available voices for debugging
  async getAvailableVoices() {
    if (!this.client) {
      return [];
    }

    try {
      const [result] = await this.client.listVoices();
      return result.voices.filter(voice => 
        voice.languageCodes.includes('ru-RU')
      );
    } catch (error) {
      logger.error('Error getting available voices:', error);
      return [];
    }
  }

  // Check if service is properly configured
  isConfigured() {
    return this.client !== null;
  }
}

module.exports = new GoogleTTSService();
