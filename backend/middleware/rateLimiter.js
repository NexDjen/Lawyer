const logger = require('../utils/logger');

// Простой rate limiter без внешних зависимостей
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 минута по умолчанию
    this.max = options.max || 10; // 10 запросов по умолчанию
    this.message = options.message || 'Слишком много запросов, попробуйте позже';
    this.requests = new Map();
    
    // Очистка старых записей каждую минуту
    setInterval(() => this.cleanup(), this.windowMs);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now - data.resetTime > this.windowMs) {
        this.requests.delete(key);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      // Используем IP + userId для идентификации
      const identifier = req.body?.userId || req.ip || req.connection.remoteAddress;
      const now = Date.now();

      if (!this.requests.has(identifier)) {
        this.requests.set(identifier, {
          count: 1,
          resetTime: now
        });
        return next();
      }

      const requestData = this.requests.get(identifier);

      // Если прошло больше времени чем windowMs, сбрасываем счетчик
      if (now - requestData.resetTime > this.windowMs) {
        requestData.count = 1;
        requestData.resetTime = now;
        return next();
      }

      // Проверяем лимит
      if (requestData.count >= this.max) {
        logger.warn('Rate limit exceeded', {
          identifier: identifier.substring(0, 20),
          count: requestData.count,
          max: this.max
        });

        return res.status(429).json({
          error: this.message,
          retryAfter: Math.ceil((this.windowMs - (now - requestData.resetTime)) / 1000),
          limit: this.max,
          windowMs: this.windowMs
        });
      }

      // Увеличиваем счетчик
      requestData.count++;
      next();
    };
  }
}

// Rate limiters для разных эндпоинтов
const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 минута
  max: 10, // 10 запросов в минуту
  message: 'Слишком много Chat запросов. Попробуйте через минуту'
});

const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 минута
  max: 100, // 100 запросов в минуту для API
  message: 'Слишком много API запросов. Попробуйте через минуту'
});

module.exports = {
  chatRateLimiter: chatRateLimiter.middleware(),
  apiRateLimiter: apiRateLimiter.middleware()
};


