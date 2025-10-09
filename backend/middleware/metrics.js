const logger = require('../utils/logger');

// Простой мониторинг производительности без внешних зависимостей
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {}
      },
      responseTime: {
        chat: [],
        health: [],
        documents: []
      },
      system: {
        startTime: Date.now(),
        uptime: 0
      }
    };
    
    // Очистка старых метрик каждые 5 минут
    setInterval(() => this.cleanupOldMetrics(), 5 * 60 * 1000);
  }

  recordRequest(endpoint, method, statusCode, responseTime) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    const key = `${method} ${endpoint}`;
    if (!this.metrics.requests.byEndpoint[key]) {
      this.metrics.requests.byEndpoint[key] = {
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      };
    }

    const endpointMetrics = this.metrics.requests.byEndpoint[key];
    endpointMetrics.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      endpointMetrics.successful++;
    } else {
      endpointMetrics.failed++;
    }

    // Обновляем статистику времени ответа
    endpointMetrics.avgResponseTime = 
      (endpointMetrics.avgResponseTime * (endpointMetrics.total - 1) + responseTime) / endpointMetrics.total;
    
    endpointMetrics.maxResponseTime = Math.max(endpointMetrics.maxResponseTime, responseTime);
    endpointMetrics.minResponseTime = Math.min(endpointMetrics.minResponseTime, responseTime);

    // Сохраняем время ответа для конкретных эндпоинтов
    if (endpoint.includes('/chat')) {
      this.metrics.responseTime.chat.push({
        timestamp: Date.now(),
        responseTime
      });
    } else if (endpoint.includes('/health')) {
      this.metrics.responseTime.health.push({
        timestamp: Date.now(),
        responseTime
      });
    } else if (endpoint.includes('/documents')) {
      this.metrics.responseTime.documents.push({
        timestamp: Date.now(),
        responseTime
      });
    }
  }

  cleanupOldMetrics() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    Object.keys(this.metrics.responseTime).forEach(key => {
      this.metrics.responseTime[key] = this.metrics.responseTime[key].filter(
        item => item.timestamp > fiveMinutesAgo
      );
    });
  }

  getMetrics() {
    this.metrics.system.uptime = Date.now() - this.metrics.system.startTime;
    
    // Вычисляем средние значения за последние 5 минут
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    const recentChatTimes = this.metrics.responseTime.chat.filter(
      item => item.timestamp > fiveMinutesAgo
    );
    
    const recentHealthTimes = this.metrics.responseTime.health.filter(
      item => item.timestamp > fiveMinutesAgo
    );

    return {
      ...this.metrics,
      performance: {
        chat: {
          avgResponseTime: recentChatTimes.length > 0 
            ? recentChatTimes.reduce((sum, item) => sum + item.responseTime, 0) / recentChatTimes.length 
            : 0,
          requestsPerMinute: recentChatTimes.length / 5,
          totalRequests: recentChatTimes.length
        },
        health: {
          avgResponseTime: recentHealthTimes.length > 0 
            ? recentHealthTimes.reduce((sum, item) => sum + item.responseTime, 0) / recentHealthTimes.length 
            : 0,
          requestsPerMinute: recentHealthTimes.length / 5,
          totalRequests: recentHealthTimes.length
        }
      }
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const uptime = metrics.system.uptime;
    const successRate = metrics.requests.total > 0 
      ? (metrics.requests.successful / metrics.requests.total) * 100 
      : 100;

    return {
      status: 'healthy',
      uptime: Math.floor(uptime / 1000), // в секундах
      successRate: Math.round(successRate * 100) / 100,
      totalRequests: metrics.requests.total,
      avgChatResponseTime: metrics.performance.chat.avgResponseTime,
      requestsPerMinute: metrics.performance.chat.requestsPerMinute
    };
  }
}

const metrics = new PerformanceMetrics();

// Middleware для сбора метрик
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const endpoint = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    metrics.recordRequest(endpoint, method, statusCode, responseTime);
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  metrics,
  metricsMiddleware
};

