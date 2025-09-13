const logger = require('../utils/logger');

// Конфигурация тарификации
const PRICING_CONFIG = {
  // Стоимость 1 часа голосового ИИ
  HOURLY_RATE: 199, // рублей
  DISCOUNTED_RATE: 299, // рублей (без скидки)

  // Стоимость за минуту (для точных расчетов)
  MINUTE_RATE: 199 / 60, // рублей за минуту
  DISCOUNTED_MINUTE_RATE: 299 / 60, // рублей за минуту

  // Минимальная сумма списания
  MINIMUM_CHARGE: 1, // рублей

  // Лимиты
  FREE_MINUTES_PER_DAY: 5, // бесплатные минуты в день
  MAX_DAILY_USAGE: 480, // максимум 8 часов в день
};

// Класс для управления тарификацией голосового ИИ
class VoicePricingService {
  constructor() {
    this.activeSessions = new Map(); // userId -> session data
    this.userDailyUsage = new Map(); // userId -> daily usage data
  }

  // Начать отслеживание сессии голосового ИИ
  startVoiceSession(userId, textLength = 0) {
    const sessionId = `voice_${userId}_${Date.now()}`;
    const startTime = Date.now();

    // Оцениваем продолжительность на основе длины текста
    // Средняя скорость речи: ~150 слов в минуту
    const estimatedDuration = Math.max(30, Math.ceil((textLength / 150) * 60)); // минимум 30 секунд

    const session = {
      sessionId,
      userId,
      startTime,
      estimatedDuration,
      actualDuration: 0,
      textLength,
      status: 'active',
      cost: 0,
      paused: false,
      pauseStartTime: null,
      totalPauseTime: 0
    };

    this.activeSessions.set(sessionId, session);

    logger.info('Voice session started', {
      sessionId,
      userId,
      estimatedDuration,
      textLength
    });

    return session;
  }

  // Завершить сессию голосового ИИ
  endVoiceSession(sessionId, actualDuration = null) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return null;
    }

    const endTime = Date.now();
    const totalDuration = actualDuration ||
      Math.floor((endTime - session.startTime - session.totalPauseTime) / 1000);

    session.actualDuration = totalDuration;
    session.status = 'completed';

    // Рассчитываем стоимость
    const cost = this.calculateCost(session.userId, totalDuration);
    session.cost = cost;

    // Обновляем статистику пользователя
    this.updateUserStats(session.userId, totalDuration, cost);

    // Списываем средства (в реальном приложении здесь был бы вызов платежной системы)
    this.deductFunds(session.userId, cost);

    logger.info('Voice session ended', {
      sessionId,
      userId: session.userId,
      duration: totalDuration,
      cost
    });

    this.activeSessions.delete(sessionId);
    return session;
  }

  // Приостановить сессию
  pauseVoiceSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session && !session.paused) {
      session.paused = true;
      session.pauseStartTime = Date.now();
      logger.info('Voice session paused', { sessionId });
    }
  }

  // Возобновить сессию
  resumeVoiceSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session && session.paused) {
      session.paused = false;
      const pauseDuration = Date.now() - session.pauseStartTime;
      session.totalPauseTime += pauseDuration;
      session.pauseStartTime = null;
      logger.info('Voice session resumed', { sessionId });
    }
  }

  // Рассчитать стоимость использования
  calculateCost(userId, durationInSeconds) {
    const durationInMinutes = durationInSeconds / 60;

    // Проверяем дневной лимит бесплатного использования
    const dailyUsage = this.getUserDailyUsage(userId);
    const remainingFreeMinutes = Math.max(0, PRICING_CONFIG.FREE_MINUTES_PER_DAY - dailyUsage.minutes);

    let cost = 0;

    if (durationInMinutes <= remainingFreeMinutes) {
      // Полностью бесплатное использование
      cost = 0;
    } else {
      // Частично или полностью платное использование
      const paidMinutes = durationInMinutes - remainingFreeMinutes;
      cost = Math.max(PRICING_CONFIG.MINIMUM_CHARGE,
        Math.ceil(paidMinutes * PRICING_CONFIG.MINUTE_RATE * 100) / 100); // округление до копеек
    }

    return cost;
  }

  // Получить статистику использования пользователя за день
  getUserDailyUsage(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `${userId}_${today}`;

    if (!this.userDailyUsage.has(key)) {
      this.userDailyUsage.set(key, {
        userId,
        date: today,
        minutes: 0,
        cost: 0,
        sessions: 0
      });
    }

    return this.userDailyUsage.get(key);
  }

  // Обновить статистику пользователя
  updateUserStats(userId, durationInSeconds, cost) {
    const dailyUsage = this.getUserDailyUsage(userId);
    dailyUsage.minutes += durationInSeconds / 60;
    dailyUsage.cost += cost;
    dailyUsage.sessions += 1;

    // Ограничиваем использование до максимального дневного лимита
    if (dailyUsage.minutes > PRICING_CONFIG.MAX_DAILY_USAGE) {
      logger.warn('Daily usage limit exceeded', { userId, minutes: dailyUsage.minutes });
    }
  }

  // Проверить, может ли пользователь использовать голосовой ИИ
  canUseVoice(userId, estimatedDuration = 60) {
    // Проверяем дневной лимит
    const dailyUsage = this.getUserDailyUsage(userId);
    if (dailyUsage.minutes + (estimatedDuration / 60) > PRICING_CONFIG.MAX_DAILY_USAGE) {
      return {
        canUse: false,
        reason: 'Превышен дневной лимит использования (8 часов)',
        remainingTime: Math.max(0, PRICING_CONFIG.MAX_DAILY_USAGE - dailyUsage.minutes)
      };
    }

    // В реальном приложении здесь была бы проверка баланса
    // Пока возвращаем true для демонстрации
    return {
      canUse: true,
      estimatedCost: this.calculateCost(userId, estimatedDuration)
    };
  }

  // Списать средства (заглушка для демонстрации)
  deductFunds(userId, amount) {
    // В реальном приложении здесь был бы вызов платежной системы
    logger.info('Funds deducted', { userId, amount });

    // Обновляем баланс в localStorage (для демонстрации)
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.id === userId);
      if (user) {
        user.walletBalance = Math.max(0, (user.walletBalance || 0) - amount);
        localStorage.setItem('users', JSON.stringify(users));

        // Обновляем текущего пользователя
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.id === userId) {
          currentUser.walletBalance = user.walletBalance;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
      }
    } catch (error) {
      logger.error('Failed to deduct funds from localStorage', error);
    }
  }

  // Получить информацию о тарифах
  getPricingInfo(userId) {
    const dailyUsage = this.getUserDailyUsage(userId);

    return {
      hourlyRate: PRICING_CONFIG.HOURLY_RATE,
      discountedRate: PRICING_CONFIG.DISCOUNTED_RATE,
      minuteRate: PRICING_CONFIG.MINUTE_RATE,
      discountedMinuteRate: PRICING_CONFIG.DISCOUNTED_MINUTE_RATE,
      freeMinutesPerDay: PRICING_CONFIG.FREE_MINUTES_PER_DAY,
      maxDailyUsage: PRICING_CONFIG.MAX_DAILY_USAGE,
      currentUsage: {
        minutes: dailyUsage.minutes,
        cost: dailyUsage.cost,
        sessions: dailyUsage.sessions,
        remainingFreeMinutes: Math.max(0, PRICING_CONFIG.FREE_MINUTES_PER_DAY - dailyUsage.minutes)
      }
    };
  }

  // Получить активные сессии пользователя
  getActiveSessions(userId) {
    const sessions = [];
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId && session.status === 'active') {
        sessions.push(session);
      }
    }
    return sessions;
  }

  // Очистить старые сессии (вызывать периодически)
  cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 часа
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.startTime > maxAge) {
        this.endVoiceSession(sessionId);
      }
    }
  }
}

// Создаем экземпляр сервиса
const voicePricingService = new VoicePricingService();

// Периодическая очистка старых сессий
setInterval(() => {
  voicePricingService.cleanupOldSessions();
}, 60 * 60 * 1000); // каждый час

module.exports = voicePricingService;

