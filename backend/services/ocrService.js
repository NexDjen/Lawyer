const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger');
const { OpenAIVisionOCR } = require('./openaiOCRService');

// Основная функция для обработки документа с OpenAI Vision OCR
const processDocumentWithOCR = async (filePath, documentType = null) => {
  try {
    logger.info('Начинаем обработку документа с OpenAI Vision OCR', { filePath, documentType });
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Файл не найден');
    }

    // Проверяем наличие OpenAI API ключа
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API ключ не настроен. Пожалуйста, добавьте OPENAI_API_KEY в переменные окружения.');
    }

    // Используем OpenAI Vision API
    const openaiOCR = new OpenAIVisionOCR();
    
    // Извлекаем текст из изображения
    const ocrResult = await openaiOCR.extractTextFromImage(filePath, documentType);
    
    // Извлекаем структурированные данные из текста
    const result = await openaiOCR.extractFieldsFromText(ocrResult.text, documentType);
    
    logger.info('OpenAI Vision OCR успешно завершен', {
      documentType: result.documentType || documentType,
      confidence: result.confidence,
      extractedFields: Object.keys(result.extractedData).length,
      textLength: ocrResult.text.length
    });

    return {
      extractedData: result.extractedData,
      confidence: result.confidence,
      documentType: result.documentType || documentType,
      recognizedText: ocrResult.text
    };
    
  } catch (error) {
    logger.error('Ошибка OpenAI Vision OCR', { error: error.message });
    throw error;
  }
};

// Функция для тестирования OCR с текстовыми данными
const testOCRWithText = async (text, documentType = 'passport') => {
  try {
    logger.info('Тестирование OCR с текстовыми данными', { documentType, textLength: text.length });
    
    // Проверяем наличие OpenAI API ключа
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API ключ не настроен. Пожалуйста, добавьте OPENAI_API_KEY в переменные окружения.');
    }

    const openaiOCR = new OpenAIVisionOCR();
    
    // Извлекаем структурированные данные из текста
    const result = await openaiOCR.extractFieldsFromText(text, documentType);
    
    logger.info('Тестовый OCR завершен', {
      documentType: result.documentType,
      confidence: result.confidence,
      extractedFields: Object.keys(result.extractedData).length
    });

    return {
      extractedData: result.extractedData,
      confidence: result.confidence,
      documentType: result.documentType,
      recognizedText: text
    };
    
  } catch (error) {
    logger.error('Ошибка тестового OCR', { error: error.message });
    throw error;
  }
};

// Функция для определения типа документа по тексту
const detectDocumentType = (text) => {
  if (!text) return 'unknown';
  
  const lowerText = text.toLowerCase();
  
  // Определяем тип документа по ключевым словам
  if (lowerText.includes('паспорт') || lowerText.includes('passport')) {
    return 'passport';
  }
  if (lowerText.includes('водительское') || lowerText.includes('удостоверение') || lowerText.includes('driver')) {
    return 'driver_license';
  }
  if (lowerText.includes('свидетельство') || lowerText.includes('birth')) {
    return 'birth_certificate';
  }
  if (lowerText.includes('договор') || lowerText.includes('contract')) {
    return 'contract';
  }
  if (lowerText.includes('справка') || lowerText.includes('certificate')) {
    return 'certificate';
  }
  
  return 'unknown';
};

// Функция для предобработки изображения (опционально, для улучшения качества)
const preprocessImage = async (imagePath, options = {}) => {
  try {
    const tempDir = path.join(__dirname, '..', 'temp');
    await fsp.mkdir(tempDir, { recursive: true });

    const outPath = path.join(
      tempDir,
      `ocr_preprocessed_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
    );

    const image = sharp(imagePath, { failOn: 'none' }).rotate(); // авто-ориентация
    const metadata = await image.metadata();

    // Масштабируем мелкие фото для лучшего распознавания
    if (metadata.width < 1000 || metadata.height < 1000) {
      await image.resize(1000, 1000, { fit: 'inside', withoutEnlargement: false });
    }

    // Применяем улучшения контраста
    await image
      .normalize()
      .sharpen()
      .png({ quality: 90 })
      .toFile(outPath);

    logger.info('Изображение предобработано', { 
      originalSize: `${metadata.width}x${metadata.height}`,
      outputPath: outPath 
    });

    return outPath;
  } catch (error) {
    logger.warn('Ошибка предобработки изображения', { error: error.message });
    return imagePath; // Возвращаем оригинальный путь в случае ошибки
  }
};

module.exports = {
  processDocumentWithOCR,
  testOCRWithText,
  detectDocumentType,
  preprocessImage
}; 