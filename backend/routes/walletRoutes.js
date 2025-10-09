const express = require('express');
const logger = require('../utils/logger');
const walletService = require('../services/walletService');

const router = express.Router();

// helper to get userId; в реальном приложении берется из аутентификации
function getUserId(req) {
  return req.user?.id || req.body.userId || req.query.userId || 'demo_user';
}

// Получение баланса пользователя
router.get('/balance', async (req, res) => {
  try {
    const userId = getUserId(req);
    const balance = await walletService.getBalance(userId);
    res.json({ success: true, data: balance });
  } catch (error) {
    logger.error('Wallet balance error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Пополнение счета
router.post('/deposit', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, paymentMethod } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    const tx = await walletService.deposit(userId, amount, paymentMethod);
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('Wallet deposit error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Вывод средств
router.post('/withdraw', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, walletAddress } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    const tx = await walletService.withdraw(userId, amount, walletAddress);
    res.json({ success: true, data: tx });
  } catch (error) {
    logger.error('Wallet withdrawal error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение истории транзакций
router.get('/transactions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;
    const result = await walletService.getTransactions(userId, limit, offset);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Wallet transactions error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение курса валют (для конвертации)
router.get('/rates', (req, res) => {
  try {
    const rates = {
      USD: 0.011,
      EUR: 0.010,
      BTC: 0.00000015,
      ETH: 0.0000025,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    logger.error('Wallet rates error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exchange rates'
    });
  }
});

// Получить информацию о тарифах голосового ИИ
router.get('/voice-pricing', (req, res) => {
  try {
    const voicePricingService = require('../services/voicePricingService');

    // В реальном приложении здесь нужно получить userId из токена/сессии
    // Пока используем фиктивный userId для демонстрации
    const userId = 'demo_user';

    const pricingInfo = voicePricingService.getPricingInfo(userId);

    logger.info('Voice pricing info requested', { userId });
    res.json({
      success: true,
      data: pricingInfo
    });
  } catch (error) {
    logger.error('Voice pricing error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voice pricing info'
    });
  }
});

// Проверить возможность использования голосового ИИ
router.post('/voice-check', (req, res) => {
  try {
    const { estimatedDuration = 60 } = req.body;
    const voicePricingService = require('../services/voicePricingService');

    // В реальном приложении здесь нужно получить userId из токена/сессии
    const userId = getUserId(req);

    const canUse = voicePricingService.canUseVoice(userId, estimatedDuration);

    logger.info('Voice usage check', { userId, estimatedDuration, canUse });
    res.json({
      success: true,
      data: canUse
    });
  } catch (error) {
    logger.error('Voice check error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check voice usage'
    });
  }
});

// Начать сессию голосового ИИ
router.post('/voice-session/start', (req, res) => {
  try {
    const { textLength = 0 } = req.body;
    const voicePricingService = require('../services/voicePricingService');

    // В реальном приложении здесь нужно получить userId из токена/сессии
    const userId = getUserId(req);

    const session = voicePricingService.startVoiceSession(userId, textLength);

    logger.info('Voice session started', { sessionId: session.sessionId, userId });
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Voice session start error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start voice session'
    });
  }
});

// Завершить сессию голосового ИИ
router.post('/voice-session/end', (req, res) => {
  try {
    const { sessionId, actualDuration } = req.body;
    const voicePricingService = require('../services/voicePricingService');

    const session = voicePricingService.endVoiceSession(sessionId, actualDuration);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    logger.info('Voice session ended', {
      sessionId,
      userId: session.userId,
      duration: session.actualDuration,
      cost: session.cost
    });

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Voice session end error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end voice session'
    });
  }
});

// Получить активные сессии пользователя
router.get('/voice-sessions/active', (req, res) => {
  try {
    const voicePricingService = require('../services/voicePricingService');

    // В реальном приложении здесь нужно получить userId из токена/сессии
    const userId = getUserId(req);

    const sessions = voicePricingService.getActiveSessions(userId);

    logger.info('Active voice sessions requested', { userId, count: sessions.length });
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Active voice sessions error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active voice sessions'
    });
  }
});

// Приостановить сессию голосового ИИ
router.post('/voice-session/pause', (req, res) => {
  try {
    const { sessionId } = req.body;
    const voicePricingService = require('../services/voicePricingService');

    voicePricingService.pauseVoiceSession(sessionId);

    logger.info('Voice session paused', { sessionId });
    res.json({
      success: true,
      message: 'Session paused'
    });
  } catch (error) {
    logger.error('Voice session pause error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause voice session'
    });
  }
});

// Возобновить сессию голосового ИИ
router.post('/voice-session/resume', (req, res) => {
  try {
    const { sessionId } = req.body;
    const voicePricingService = require('../services/voicePricingService');

    voicePricingService.resumeVoiceSession(sessionId);

    logger.info('Voice session resumed', { sessionId });
    res.json({
      success: true,
      message: 'Session resumed'
    });
  } catch (error) {
    logger.error('Voice session resume error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume voice session'
    });
  }
});

// Text chat pricing endpoint
router.get('/text-pricing', (req, res) => {
  try {
    const textPricingService = require('../services/textPricingService');
    const info = textPricingService.getPricingInfo();
    logger.info('Text chat pricing requested');
    res.json({ success: true, data: info });
  } catch (error) {
    logger.error('Text pricing error', error);
    res.status(500).json({ success: false, error: 'Failed to get text chat pricing' });
  }
});

// Document generation pricing endpoint
router.get('/document-pricing', (req, res) => {
  try {
    const { perPageRate } = require('../config/config').pricing.documentGeneration;
    logger.info('Document generation pricing requested');
    res.json({ success: true, data: { perPageRate } });
  } catch (error) {
    logger.error('Document pricing error', error);
    res.status(500).json({ success: false, error: 'Failed to get document generation pricing' });
  }
});

// Photo analysis pricing endpoint
router.get('/photo-pricing', (req, res) => {
  try {
    const photoConfig = require('../config/config').pricing.photoAnalysis;
    logger.info('Photo analysis pricing requested');
    res.json({ success: true, data: photoConfig });
  } catch (error) {
    logger.error('Photo pricing error', error);
    res.status(500).json({ success: false, error: 'Failed to get photo analysis pricing' });
  }
});

module.exports = router;
