const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

// Получение баланса пользователя
router.get('/balance', (req, res) => {
  try {
    // В реальном приложении здесь будет проверка авторизации
    // Пока возвращаем моковые данные
    const balance = {
      amount: 1250.50,
      currency: 'RUB',
      lastUpdated: new Date().toISOString()
    };

    logger.info('Wallet balance requested');
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    logger.error('Wallet balance error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet balance'
    });
  }
});

// Пополнение счета
router.post('/deposit', (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // В реальном приложении здесь будет интеграция с платежной системой
    const transaction = {
      id: `dep_${Date.now()}`,
      type: 'deposit',
      amount: Number(amount),
      paymentMethod: paymentMethod || 'card',
      status: 'completed',
      timestamp: new Date().toISOString(),
      description: 'Пополнение счета'
    };

    logger.info('Wallet deposit processed', { amount, paymentMethod });
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Wallet deposit error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deposit'
    });
  }
});

// Вывод средств
router.post('/withdraw', (req, res) => {
  try {
    const { amount, walletAddress } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // В реальном приложении здесь будет проверка баланса и интеграция с платежной системой
    const transaction = {
      id: `wdr_${Date.now()}`,
      type: 'withdrawal',
      amount: -Number(amount),
      walletAddress,
      status: 'pending',
      timestamp: new Date().toISOString(),
      description: 'Вывод средств'
    };

    logger.info('Wallet withdrawal requested', { amount, walletAddress });
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Wallet withdrawal error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal'
    });
  }
});

// Получение истории транзакций
router.get('/transactions', (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    // Моковые транзакции для демонстрации
    const transactions = [
      {
        id: 'txn_001',
        type: 'deposit',
        amount: 500,
        description: 'Пополнение счета',
        date: '2025-09-01T10:00:00Z',
        status: 'completed'
      },
      {
        id: 'txn_002',
        type: 'withdrawal',
        amount: -200,
        description: 'Вывод средств',
        date: '2025-08-28T15:30:00Z',
        status: 'completed'
      },
      {
        id: 'txn_003',
        type: 'service',
        amount: -50,
        description: 'Оплата услуги анализа документов',
        date: '2025-08-25T09:15:00Z',
        status: 'completed'
      }
    ];

    logger.info('Wallet transactions requested', { limit, offset });
    res.json({
      success: true,
      data: {
        transactions: transactions.slice(offset, offset + limit),
        total: transactions.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Wallet transactions error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
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
    const userId = 'demo_user';

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
    const userId = 'demo_user';

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
    const userId = 'demo_user';

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
