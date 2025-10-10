const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const WebSocket = require('ws');

// Увеличиваем лимиты для заголовков на уровне Node.js
process.env.NODE_OPTIONS = '--max-http-header-size=1048576'; // 1MB для заголовков

// Импорты конфигурации и утилит
const config = require('./config/config');
const logger = require('./utils/logger');
const ErrorHandler = require('./middleware/errorHandler');
const corsOptions = require('./middleware/cors');
const { metricsMiddleware, metrics } = require('./middleware/metrics');

// Импорты маршрутов
const chatRoutes = require('./routes/chatRoutes');
const documentRoutes = require('./routes/documentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const courtRoutes = require('./routes/courtRoutes');
const walletRoutes = require('./routes/walletRoutes');
const profileRoutes = require('./routes/profileRoutes');

require('dotenv').config({ path: path.resolve(__dirname, '../config/.env'), override: true });

// Enable HTTP proxy for AI requests to bypass regional restrictions
if (process.env.HTTPS_PROXY) {
  // global-agent will route all HTTP/HTTPS requests through the proxy
  process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.HTTPS_PROXY;
  require('global-agent/bootstrap');
}

// WebSocket сервер для стриминга TTS
let wss = null;

// TTS стриминг функция
async function ttsStream(text, { model = 'tts-1', voice = 'nova', speed = 1 } = {}) {
  const axios = require('axios');
  const WINDEXAI_TTS_URL = 'https://api.windexai.com/v1/audio/speech';
  const agent = new https.Agent({ keepAlive: true, timeout: 30000 });

  try {
    const res = await axios.post(
      WINDEXAI_TTS_URL,
      {
        model,
        voice,
        input: text,
        speed,
        response_format: 'opus',
        stream: true
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WINDEXAI_API_KEY}`
        },
        responseType: 'stream', 
        httpsAgent: agent 
      }
    );
    return res.data; // Readable stream
  } catch (error) {
    logger.error('TTS stream error:', error);
    return null;
  }
}

// Функция для отправки сообщений через WebSocket
function broadcastToClients(message) {
  if (wss) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

// Функция для стриминга аудио через WebSocket
async function streamAudioToClients(text, messageId) {
  try {
    // Отправляем начало аудио
    broadcastToClients({ type: 'audio-start', id: messageId });
    
    const audioStream = await ttsStream(text);
    if (!audioStream) {
      logger.warn('TTS stream failed, silent mode');
      return;
    }

    // Стримим аудио чанки
    audioStream.on('data', chunk => {
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(chunk); // binary frames
          }
        });
      }
    });

    audioStream.on('end', () => {
      broadcastToClients({ type: 'audio-end', id: messageId });
      logger.info('Audio streaming completed for message:', messageId);
    });

    audioStream.on('error', (error) => {
      logger.error('Audio stream error:', error);
      broadcastToClients({ type: 'audio-error', id: messageId, error: error.message });
    });

  } catch (error) {
    logger.error('Failed to stream audio:', error);
    broadcastToClients({ type: 'audio-error', id: messageId, error: error.message });
  }
}

// Обработка WebSocket сообщений чата
async function handleChatMessage(data, ws) {
  try {
    const { message, history = [] } = data;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('💬 Processing WebSocket chat message:', {
      messageId,
      messageLength: message.length,
      messagePreview: message.substring(0, 100),
      historyLength: history.length,
      timestamp: new Date().toISOString()
    });
    
    // Отправляем подтверждение получения сообщения
    broadcastToClients({ 
      type: 'message-received', 
      id: messageId 
    });
    
    // Генерируем ответ через WindexAI
    const chatService = require('./services/chatService');
    logger.info('🤖 Calling chatService.generateResponse...');
    const response = await chatService.generateResponse(message, history);
    
    logger.info('✅ Chat response generated', {
      messageId,
      responseLength: response.length,
      responsePreview: response.substring(0, 100)
    });
    
    // Отправляем текстовый ответ
    broadcastToClients({ 
      type: 'text', 
      id: messageId, 
      text: response 
    });
    
    // Временно отключаем аудио стриминг для тестирования
    // setTimeout(() => {
    //   streamAudioToClients(response, messageId);
    // }, 100);
    
  } catch (error) {
    logger.error('❌ WebSocket chat processing error:', {
      error: error.message,
      stack: error.stack,
      messageId: data.messageId || 'unknown'
    });
    broadcastToClients({ 
      type: 'error', 
      message: 'Failed to process message',
      details: error.message 
    });
  }
}

class Server {
  constructor() {
    this.app = express();
    this.port = config.server.port;
    this.host = config.server.host;
  }

  async initialize() {
    try {
      // Создаем необходимые директории
      await this._createDirectories();
      
      // Настраиваем middleware
      this._setupMiddleware();
      
      // Настраиваем маршруты
      this._setupRoutes();
      
      // Настраиваем обработку ошибок
      this._setupErrorHandling();
      
      logger.info('Server initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize server', error);
      throw error;
    }
  }

  async _createDirectories() {
    const directories = [
      config.upload.uploadDir,
      config.upload.tempDir
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.debug(`Directory created/verified: ${dir}`);
      } catch (error) {
        logger.warn(`Failed to create directory ${dir}`, error);
      }
    }
  }

  _setupMiddleware() {
    // Устанавливаем увеличенные таймауты для OCR обработки
    this.app.use((req, res, next) => {
      // Увеличиваем таймауты для OCR запросов
      if (req.path.includes('/ocr')) {
        req.setTimeout(120000); // 2 минуты для OCR
        res.setTimeout(120000);
      } else {
        req.setTimeout(30000); // 30 секунд для остальных
        res.setTimeout(30000);
      }
      next();
    });
    
    // Debug: log allowed CORS origins
    logger.info('Allowed CORS origins:', config.cors.origins);
    this.app.use(cors(corsOptions));
    
    // Middleware для сбора метрик производительности
    this.app.use(metricsMiddleware);
    
    // Парсинг JSON с увеличенными лимитами для загрузки файлов
    this.app.use(express.json({ 
      limit: '5gb',
      extended: true 
    }));
    
    // Парсинг URL-encoded данных с увеличенными лимитами
    this.app.use(express.urlencoded({ 
      limit: '5gb', 
      extended: true,
      parameterLimit: 1000
    }));
    
    // Статические файлы
    this.app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
    
    // Статические файлы фронтенда для глобального доступа
    this.app.use(express.static(path.join(process.cwd(), 'build')));
    
    // Middleware для обработки ошибок размера запроса
    this.app.use((error, req, res, next) => {
      if (error.code === 'LIMIT_FILE_SIZE') {
        logger.warn('File too large', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          contentLength: req.get('Content-Length')
        });
        return res.status(413).json({
          error: 'Файл слишком большой',
          details: 'Максимальный размер файла: 5GB',
          timestamp: new Date().toISOString()
        });
      }
      if (error.code === 'LIMIT_FIELD_VALUE') {
        logger.warn('Field value too large', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(413).json({
          error: 'Слишком большое значение поля',
          details: 'Размер поля превышает допустимый лимит',
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    });

    // Логирование запросов
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length')
      });
      next();
    });
  }

  _setupRoutes() {
    logger.info('Setting up routes...');
    
    // API маршруты - сначала специфичные, потом общие
    this.app.use('/api/chat', chatRoutes);
    logger.info('Registered /api/chat routes');
    
    this.app.use('/api/admin', adminRoutes);
    logger.info('Registered /api/admin routes');
    
    this.app.use('/api/court', courtRoutes);
    logger.info('Registered /api/court routes');
    
    this.app.use('/api/wallet', walletRoutes);
    logger.info('Registered /api/wallet routes');
    
    this.app.use('/api/documents', documentRoutes); // Исправлено: добавляем /documents
    logger.info('Registered /api/documents routes');
    
    this.app.use('/api/profile', profileRoutes); // Управление профилями пользователей
    logger.info('Registered /api/profile routes');

    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
    logger.info('Registered /health route');
    
    logger.info('All routes registered successfully');
  }

  _setupErrorHandling() {
    // Обработка 404 ошибок только для API запросов
    this.app.use('/api/*', ErrorHandler.handleNotFound);
    
    // SPA fallback - все НЕ-API роуты возвращают index.html
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
    });
    
    // Глобальная обработка ошибок
    this.app.use(ErrorHandler.handleError);
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          logger.info(`🚀 Server started successfully`, {
            host: this.host,
            port: this.port,
            environment: process.env.NODE_ENV || 'development',
            windexaiApiKey: process.env.WINDEXAI_API_KEY ? 'SET' : 'NOT SET',
            windexaiModel: process.env.WINDEXAI_MODEL || 'gpt-4o-mini'
          });
          
          // Инициализируем WebSocket сервер
          wss = new WebSocket.Server({ 
            server: this.server,
            path: '/api/ws',
            perMessageDeflate: false, // Отключаем сжатие для лучшей производительности
            maxPayload: 1024 * 1024 // 1MB лимит
          });
          
          wss.on('connection', (ws, req) => {
            logger.info('🔌 WebSocket client connected', {
              ip: req.socket.remoteAddress,
              userAgent: req.headers['user-agent'],
              url: req.url
            });
            
            // Устанавливаем таймаут для соединения
            ws.isAlive = true;
            ws.on('pong', () => {
              ws.isAlive = true;
            });
            
            // Добавляем обработчик для предотвращения множественных подключений
            ws.on('close', (code, reason) => {
              logger.info('🔌 WebSocket client disconnected', { code, reason: reason.toString() });
              ws.isAlive = false;
            });
            
            ws.on('message', (message) => {
              try {
                // Проверяем размер сообщения
                if (message.length > 1024 * 1024) { // 1MB
                  logger.warn('Message too large, rejecting');
                  ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Message too large',
                    details: 'Message size exceeds 1MB limit'
                  }));
                  return;
                }
                
                const data = JSON.parse(message.toString());
                logger.debug('WebSocket message received:', data);
                
                // Обработка различных типов сообщений
                if (data.type === 'chat') {
                  // Обработка чат сообщений
                  logger.info('💬 WebSocket chat message received', { 
                    messageLength: data.message?.length || 0,
                    hasHistory: !!data.history?.length 
                  });
                  handleChatMessage(data, ws);
                } else if (data.type === 'ping') {
                  // Обработка ping для keep-alive
                  ws.send(JSON.stringify({ type: 'pong' }));
                }
              } catch (error) {
                logger.error('WebSocket message parsing error:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Invalid message format',
                  details: error.message
                }));
              }
            });
            
            ws.on('error', (error) => {
              logger.error('WebSocket error:', error);
            });
          });
          
          // Ping/pong для поддержания соединения
          const interval = setInterval(() => {
            wss.clients.forEach((ws) => {
              if (ws.isAlive === false) {
                logger.warn('Terminating inactive WebSocket connection');
                return ws.terminate();
              }
              
              ws.isAlive = false;
              ws.ping();
            });
          }, 30000); // Каждые 30 секунд
          
          wss.on('close', () => {
            clearInterval(interval);
          });

          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('Server error', error);
          reject(error);
        });

      } catch (error) {
        logger.error('Failed to start server', error);
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp() {
    return this.app;
  }
}

// Создание и запуск сервера
async function startServer() {
  try {
    const server = new Server();
    await server.initialize();
    await server.start();
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

// Запускаем сервер только если файл запущен напрямую
if (require.main === module) {
  startServer();
}

module.exports = Server; 