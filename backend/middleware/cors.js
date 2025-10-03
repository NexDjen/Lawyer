const config = require('../config/config');
const logger = require('../utils/logger');

const corsOptions = {
  origin: function (origin, callback) {
    // Логируем для отладки
    logger.info(`CORS request from origin: ${origin}`);
    
    // Разрешаем запросы без origin (например, из Postman)
    if (!origin) {
      logger.info('Allowing request without origin');
      return callback(null, true);
    }
    
    // В development разрешаем любые origins для внешних подключений
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`Development mode: allowing origin ${origin}`);
      return callback(null, true);
    }
    
    // Allow production domains
    if (config.cors.origins.includes(origin) || origin === 'https://w-lawyer.ru' || origin === 'https://www.w-lawyer.ru') {
      logger.info(`Origin ${origin} is allowed`);
      callback(null, true);
    } else {
      logger.warn(`Origin ${origin} is not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 