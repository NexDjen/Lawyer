const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { analyzeCourtHearing } = require('../services/courtAnalysisService');
const logger = require('../utils/logger');

const router = express.Router();

// Настройка multer для загрузки аудио файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `hearing-${timestamp}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла. Разрешены только аудио файлы.'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Маршрут для анализа судебного заседания по аудио файлу
router.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Аудио файл не предоставлен' 
      });
    }

    logger.info('Запрос на анализ судебного заседания', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const audioFilePath = req.file.path;
    const analysis = await analyzeCourtHearing(audioFilePath);

    // Сохраняем информацию о файле
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: audioFilePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Анализ судебного заседания завершен',
      analysis: analysis,
      fileInfo: fileInfo
    });

  } catch (error) {
    logger.error('Ошибка анализа судебного заседания', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Ошибка при анализе судебного заседания',
      details: error.message
    });
  }
});

// Маршрут для анализа судебного заседания по тексту
router.post('/analyze-text', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({
        error: 'Текст заседания не предоставлен'
      });
    }

    logger.info('Запрос на анализ текста судебного заседания', {
      textLength: transcript.length
    });

    const analysis = await analyzeCourtHearing(null, transcript);

    res.json({
      success: true,
      message: 'Анализ текста судебного заседания завершен',
      analysis: analysis
    });

  } catch (error) {
    logger.error('Ошибка анализа текста судебного заседания', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Ошибка при анализе текста судебного заседания',
      details: error.message
    });
  }
});

// Маршрут для демонстрации анализа (без загрузки файла)
router.post('/demo-analysis', async (req, res) => {
  try {
    logger.info('Запрос на демо анализ судебного заседания');

    const analysis = await analyzeCourtHearing();

    res.json({
      success: true,
      message: 'Демо анализ судебного заседания завершен',
      analysis: analysis
    });

  } catch (error) {
    logger.error('Ошибка демо анализа', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Ошибка при демо анализе',
      details: error.message
    });
  }
});

// Маршрут для получения списка сохраненных аудио файлов
router.get('/audio-files', async (req, res) => {
  try {
    const audioDir = path.join(__dirname, '../uploads/audio');
    
    if (!fs.existsSync(audioDir)) {
      return res.json({
        success: true,
        files: []
      });
    }

    const files = fs.readdirSync(audioDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.wav', '.mp3', '.ogg', '.m4a'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          uploadDate: stats.mtime.toISOString(),
          duration: null // Можно добавить получение длительности
        };
      })
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    logger.info('Получен список аудио файлов', {
      count: files.length
    });

    res.json({
      success: true,
      files: files
    });

  } catch (error) {
    logger.error('Ошибка получения списка аудио файлов', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Ошибка при получении списка аудио файлов',
      details: error.message
    });
  }
});

// Маршрут для получения аудио файла
router.get('/audio-files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/audio', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Файл не найден'
      });
    }

    // Отправляем файл
    res.sendFile(filePath);

  } catch (error) {
    logger.error('Ошибка получения аудио файла', {
      error: error.message,
      filename: req.params.filename
    });

    res.status(500).json({
      error: 'Ошибка при получении аудио файла',
      details: error.message
    });
  }
});

// Маршрут для удаления аудио файла
router.delete('/audio-files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/audio', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Файл не найден'
      });
    }

    fs.unlinkSync(filePath);

    logger.info('Аудио файл удален', {
      filename: filename
    });

    res.json({
      success: true,
      message: 'Аудио файл успешно удален'
    });

  } catch (error) {
    logger.error('Ошибка удаления аудио файла', {
      error: error.message,
      filename: req.params.filename
    });

    res.status(500).json({
      error: 'Ошибка при удалении аудио файла',
      details: error.message
    });
  }
});

module.exports = router; 