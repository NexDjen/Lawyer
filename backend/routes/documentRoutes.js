const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { savePDFMetadata, saveOCRResult, scheduleCleanup } = require('../services/documentStorage');
const { processDocument } = require('../services/documentService');
const { analyzeDocumentText } = require('../services/documentAnalysisService');
const { testOCRWithText, detectDocumentType } = require('../services/ocrService');
let runPythonPdfOcr;
try {
  ({ runPythonPdfOcr } = require('../services/pdfPythonOcr'));
} catch (_) {
  runPythonPdfOcr = null;
}
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (_) {
  pdfParse = null;
}
const logger = require('../utils/logger');

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB
    fieldSize: 100 * 1024 * 1024, // 100MB для полей
    fields: 1000, // увеличенное количество полей
    parts: 1000 // увеличенное количество частей
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/heic',
      'image/heif',
      'image/webp',
      'image/tiff',
      'image/bmp',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'), false);
    }
  }
});

// Маршрут для OCR обработки документов
router.post('/ocr', upload.single('document'), async (req, res) => {
  try {
    logger.info('OCR запрос начат', {
      headers: Object.keys(req.headers),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length')
    });

    if (!req.file) {
      logger.error('Файл не был загружен в multer');
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    logger.info('OCR запрос получен', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // PDF: сохраняем 3 дня и пытаемся извлечь текст (если это текстовый PDF)
    if (req.file.mimetype === 'application/pdf') {
      const meta = await savePDFMetadata(req.file.path, req.file.originalname, req.file.size);
      logger.info('PDF uploaded', meta);

      const MAX_PARSE_SIZE = 100 * 1024 * 1024; // 100MB предел для моментального парсинга
      let extractedData = null;
      let recognizedText = '';
      let confidence = undefined;
      let rasterHint = null;
      let detectedType = 'unknown';
      const tStart = Date.now();
      let ocrTimeMs = 0;

      // 1) Python OCR приоритетно (конвертация страниц через pdf2image + pytesseract)
      if (runPythonPdfOcr) {
        try {
          const py = await runPythonPdfOcr(req.file.path, 'rus+eng');
          if (py && py.recognizedText && py.recognizedText.length > 20) {
            recognizedText = py.recognizedText;
            const hintedType = req.body.documentType || detectDocumentType(recognizedText) || 'unknown';
            detectedType = hintedType;
            const testRes = await testOCRWithText(recognizedText, hintedType);
            extractedData = testRes.extractedData;
            confidence = testRes.confidence;
            ocrTimeMs = Date.now() - tStart;
            try {
              await saveOCRResult({ documentType: hintedType, extractedData, recognizedText, confidence });
            } catch (e) {
              logger.warn('Failed to persist PDF OCR result (python)', { error: e.message });
            }
          }
        } catch (e) {
          logger.warn('Python PDF OCR failed', { error: e.message });
        }
      }

      if (pdfParse && req.file.size <= MAX_PARSE_SIZE) {
        try {
          const dataBuffer = fs.readFileSync(req.file.path);
          const parsed = await pdfParse(dataBuffer);
          recognizedText = (parsed.text || '').trim();
          if (recognizedText && recognizedText.length > 20) {
            const hintedType = req.body.documentType || detectDocumentType(recognizedText) || 'unknown';
            detectedType = hintedType;
            const testRes = await testOCRWithText(recognizedText, hintedType);
            extractedData = testRes.extractedData;
            confidence = testRes.confidence;
            ocrTimeMs = ocrTimeMs || (Date.now() - tStart);
            // Сохраняем OCR результат навсегда
            try {
              await saveOCRResult({
                documentType: hintedType,
                extractedData,
                recognizedText,
                confidence,
              });
            } catch (e) {
              logger.warn('Failed to persist PDF OCR result', { error: e.message });
            }
          }
        } catch (e) {
          logger.warn('PDF text extraction failed', { error: e.message });
        }
      } else {
        if (!pdfParse) logger.warn('pdf-parse not installed; skipping PDF OCR');
        if (req.file.size > MAX_PARSE_SIZE) logger.info('PDF too large for immediate OCR; skipping', { size: req.file.size });
      }

      // Если не получилось вытащить текст напрямую — пробуем через растеризацию страниц (если установлен poppler)
      if (!extractedData) {
        try {
          const { ocrPdfByRasterization, isPdftoppmAvailable } = require('../services/pdfOcrService');
          if (await isPdftoppmAvailable()) {
            rasterHint = 'rasterized';
            const hintedType = req.body.documentType || 'unknown';
            detectedType = hintedType;
            const r = await ocrPdfByRasterization(req.file.path, hintedType);
            extractedData = r.extractedData;
            recognizedText = r.recognizedText;
            confidence = r.confidence;
            ocrTimeMs = ocrTimeMs || (Date.now() - tStart);
            // сохраняем результат
            try {
              await saveOCRResult({ documentType: hintedType, extractedData, recognizedText, confidence });
            } catch (e) {
              logger.warn('Failed to persist rasterized PDF OCR result', { error: e.message });
            }
          } else {
            logger.warn('pdftoppm not available; skip rasterized OCR');
          }
        } catch (e) {
          logger.warn('Rasterized PDF OCR failed', { error: e.message });
        }
      }

      // Доп. анализ текста для PDF, если распознан (или есть extractedData.text)
      let analysis = null;
      try {
        const baseText = (recognizedText && recognizedText.trim().length > 0)
          ? recognizedText
          : (extractedData && typeof extractedData.text === 'string' && extractedData.text.trim().length > 0
            ? extractedData.text
            : '');
        if (baseText) {
          analysis = await analyzeDocumentText(baseText);
        }
      } catch (e) {
        logger.warn('PDF analysis failed', { error: e.message });
      }

      return res.json({
        success: true,
        kind: 'pdf',
        message: extractedData ? 'PDF распознан' : 'PDF загружен и будет храниться 3 дня',
        id: meta.id,
        expiresAt: meta.expiresAt,
        extractedData: extractedData || undefined,
        recognizedText: recognizedText || undefined,
        confidence: confidence,
        mode: rasterHint,
        ocrTimeMs: extractedData ? ocrTimeMs : undefined,
        analysis,
        documentType: detectedType
      });
    }

    const convertible = ['image/heic', 'image/heif', 'image/webp', 'image/tiff', 'image/bmp'];
    if (convertible.includes(req.file.mimetype)) {
      try {
        const newPath = req.file.path.replace(path.extname(req.file.path), '.jpeg');
        await sharp(req.file.path).rotate().jpeg({ quality: 90 }).toFile(newPath);
        fs.unlinkSync(req.file.path);
        req.file.path = newPath;
        req.file.mimetype = 'image/jpeg';
        req.file.originalname = path.basename(newPath);
        logger.info('Файл конвертирован в JPEG', { newPath });
      } catch (e) {
        logger.error('Ошибка конвертации изображения', { error: e.message });
        return res.status(500).json({ error: 'Ошибка при обработке изображения. Попробуйте другой формат (JPEG/PNG).' });
      }
    }

    // Получаем тип документа из запроса
    const documentType = req.body.documentType || 'unknown';
    
    // Обрабатываем документ с помощью OCR
    const tStart = Date.now();
    const result = await processDocument(req.file.path, documentType);
    const ocrTimeMs = Date.now() - tStart;

    // Сохраняем OCR результат навсегда
    try {
      await saveOCRResult({
        documentType,
        extractedData: result.extractedData,
        recognizedText: result.recognizedText,
        confidence: result.confidence,
      });
    } catch (e) {
      logger.warn('Failed to persist OCR result', { error: e.message });
    }
    
    // Удаляем временный файл
    fs.unlinkSync(req.file.path);
    
    logger.info('OCR обработка завершена', {
      filename: req.file.originalname,
      extractedFields: Object.keys(result.extractedData || {}).length
    });

    // Доп. анализ текста (риски/рекомендации/соответствие)
    let analysis = null;
    try {
      const baseText = (result.recognizedText && result.recognizedText.trim().length > 0)
        ? result.recognizedText
        : (result.extractedData && typeof result.extractedData.text === 'string' && result.extractedData.text.trim().length > 0
          ? result.extractedData.text
          : '');
      if (baseText) {
        analysis = await analyzeDocumentText(baseText);
      }
    } catch (e) {
      logger.warn('Secondary analysis failed', { error: e.message });
    }

    res.json({
      success: true,
      message: 'Документ успешно обработан',
      extractedData: result.extractedData,
      confidence: result.confidence,
      documentType: documentType,
      recognizedText: result.recognizedText || '',
      ocrTimeMs,
      analysis
    });

  } catch (error) {
    logger.error('Ошибка OCR обработки', {
      error: error.message,
      stack: error.stack,
      errorCode: error.code
    });

    // Удаляем файл в случае ошибки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Специальная обработка ошибок multer
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'Файл слишком большой',
        details: 'Максимальный размер файла: 5GB',
        timestamp: new Date().toISOString()
      });
    }

    if (error.code === 'LIMIT_FIELD_VALUE') {
      return res.status(413).json({ 
        error: 'Слишком большое значение поля',
        details: 'Размер поля превышает допустимый лимит',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({ 
      error: 'Ошибка при обработке документа',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Маршрут для получения списка документов
router.get('/', async (req, res) => {
  try {
    // Здесь можно добавить логику для получения документов из базы данных
    res.json({ 
      success: true, 
      documents: [] 
    });
  } catch (error) {
    logger.error('Ошибка получения документов', error);
    res.status(500).json({ error: 'Ошибка при получении документов' });
  }
});

// Маршрут для удаления документа
router.delete('/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    // Здесь можно добавить логику для удаления документа из базы данных
    res.json({ 
      success: true, 
      message: 'Документ успешно удален' 
    });
  } catch (error) {
    logger.error('Ошибка удаления документа', error);
    res.status(500).json({ error: 'Ошибка при удалении документа' });
  }
});

// Тестовый маршрут для демонстрации OCR
router.post('/ocr-test', async (req, res) => {
  try {
    const { text, documentType } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Текст не предоставлен' });
    }

    logger.info('Тестовый OCR запрос', {
      textLength: text.length,
      documentType: documentType || 'passport'
    });

    // Тестируем OCR с текстовыми данными
    const result = await testOCRWithText(text, documentType);
    
    logger.info('Тестовый OCR завершен', {
      documentType: result.documentType,
      confidence: result.confidence,
      extractedFields: Object.keys(result.extractedData).length
    });

    res.json({
      success: true,
      message: 'OCR тест завершен успешно',
      extractedData: result.extractedData,
      confidence: result.confidence,
      documentType: result.documentType,
      recognizedText: result.recognizedText
    });

  } catch (error) {
    logger.error('Ошибка тестового OCR', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({ 
      error: 'Ошибка при тестировании OCR',
      details: error.message 
    });
  }
});

module.exports = router; 

// Инициализируем периодическую очистку просроченных PDF (однократно при загрузке роутера)
try { scheduleCleanup(); } catch (e) { logger?.warn?.('scheduleCleanup failed', { error: e.message }); }