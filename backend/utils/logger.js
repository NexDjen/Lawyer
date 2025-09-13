const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Создаем форматтер для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      // Безопасная сериализация для избежания циклических ссылок
      const safeMeta = {};
      for (const [key, value] of Object.entries(meta)) {
        try {
          if (typeof value === 'object' && value !== null) {
            // Для объектов с циклическими ссылками используем только основные свойства
            if (value instanceof Error) {
              safeMeta[key] = {
                message: value.message,
                stack: value.stack,
                name: value.name
              };
            } else if (value.constructor && value.constructor.name !== 'Object') {
              safeMeta[key] = `[${value.constructor.name}]`;
            } else {
              safeMeta[key] = JSON.stringify(value);
            }
          } else {
            safeMeta[key] = value;
          }
        } catch (err) {
          safeMeta[key] = '[Circular or non-serializable]';
        }
      }
      log += ` ${JSON.stringify(safeMeta)}`;
    }
    
    return log;
  })
);

// Создаем транспорты для логов
const transports = [];

// Консольный транспорт
if (config.logging.enableConsole) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// Файловый транспорт
if (config.logging.enableFile) {
  const logDir = path.join(process.cwd(), 'logs');
  
  // Создаем директорию для логов если её нет
  const fs = require('fs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Создаем логгер
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false
});

// Добавляем методы для удобства
logger.startTimer = (operation) => {
  const startTime = Date.now();
  return {
    end: (message) => {
      const duration = Date.now() - startTime;
      logger.info(`${message} (${duration}ms)`, { operation, duration });
    }
  };
};

logger.logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, `${req.method} ${req.url}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length')
    });
  });
  
  next();
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context
  });
};

logger.logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, `Performance: ${operation}`, {
    duration: `${duration}ms`,
    ...metadata
  });
};

logger.logSecurity = (event, details = {}) => {
  logger.warn(`Security event: ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logApiCall = (endpoint, method, statusCode, duration, metadata = {}) => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, `API Call: ${method} ${endpoint}`, {
    statusCode,
    duration: `${duration}ms`,
    ...metadata
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  logger.end();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  logger.end();
});

module.exports = logger; 