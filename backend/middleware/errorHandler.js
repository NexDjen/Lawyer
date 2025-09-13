const logger = require('../utils/logger');

class ErrorHandler {
  // Обработка 404 ошибок
  static handleNotFound(req, res) {
    logger.warn('Route not found', {
      method: req.method,
      url: req.url,
      ip: req.ip
    });

    res.status(404).json({
      error: 'Маршрут не найден',
      path: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Глобальная обработка ошибок
  static handleError(error, req, res, next) {
    // Логируем ошибку
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Определяем тип ошибки и соответствующий статус код
    let statusCode = 500;
    let errorMessage = 'Внутренняя ошибка сервера';

    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Ошибка валидации данных';
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
      errorMessage = 'Не авторизован';
    } else if (error.name === 'ForbiddenError') {
      statusCode = 403;
      errorMessage = 'Доступ запрещен';
    } else if (error.code === 'ENOENT') {
      statusCode = 404;
      errorMessage = 'Файл не найден';
    } else if (error.code === 'EACCES') {
      statusCode = 403;
      errorMessage = 'Нет прав доступа';
    } else if (error.code === 'ENOSPC') {
      statusCode = 507;
      errorMessage = 'Недостаточно места на диске';
    } else if (error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Превышено время ожидания';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Превышен лимит запросов';
    }

    // Отправляем ответ
    res.status(statusCode).json({
      error: errorMessage,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    });
  }

  // Обработка асинхронных ошибок
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Обработка ошибок валидации
  static handleValidationError(error) {
    const errors = Object.values(error.errors).map(err => err.message);
    return {
      error: 'Ошибка валидации',
      details: errors,
      timestamp: new Date().toISOString()
    };
  }

  // Обработка ошибок базы данных
  static handleDatabaseError(error) {
    logger.error('Database error', {
      error: error.message,
      code: error.code
    });

    return {
      error: 'Ошибка базы данных',
      timestamp: new Date().toISOString()
    };
  }

  // Обработка ошибок файловой системы
  static handleFileSystemError(error) {
    logger.error('File system error', {
      error: error.message,
      code: error.code
    });

    return {
      error: 'Ошибка файловой системы',
      timestamp: new Date().toISOString()
    };
  }

  // Обработка ошибок сети
  static handleNetworkError(error) {
    logger.error('Network error', {
      error: error.message,
      code: error.code
    });

    return {
      error: 'Ошибка сети',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ErrorHandler; 