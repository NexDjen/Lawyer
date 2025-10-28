const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const logger = require('../utils/logger');
const { processDocumentWithOCR } = require('./ocrService');
const { preprocessImageAdvanced } = require('./imagePreprocess');

// Функция для обработки документа с OCR
const processDocument = async (filePath, documentType = null) => {
  // If a .docx file is uploaded, extract text with Mammoth
  const fileObj = filePath;
  const ext = path.extname(fileObj.originalname || '').toLowerCase();
  if (ext === '.docx') {
    try {
      const { value: text } = await mammoth.extractRawText({ path: fileObj.path });
      logger.info('DOCX text extraction succeeded', { file: fileObj.originalname });
      return {
        extractedData: {},
        confidence: 1,
        documentType: documentType,
        recognizedText: text
      };
    } catch (err) {
      logger.error('DOCX text extraction failed', { error: err.message });
      // Fall back to OCR if extraction fails
    }
  }
  try {
    logger.info('Начинаем обработку документа', {
      filePath: fileObj.path,
      documentType
    });

    // Advanced предобработка (устранение бликов/шумов)
    let processedPath = fileObj.path;
    try {
      processedPath = await preprocessImageAdvanced(fileObj.path);
    } catch (error) {
      logger.warn('Предобработка изображения не удалась, используем оригинал', { error: error.message });
    }

    // Используем OpenAI Vision OCR
    const result = await processDocumentWithOCR(processedPath, documentType);
    
    return {
      extractedData: result.extractedData || result,
      confidence: result.confidence || 0.85,
      documentType: result.documentType || documentType,
      recognizedText: result.recognizedText || ''
    };
      
    } catch (error) {
    logger.error('Ошибка обработки документа', {
      error: error.message,
      filePath,
      documentType
    });
    throw error;
  }
};

// Основная функция для реального OCR распознавания документов с OpenAI Vision
const performRealOCR = async (filePath, documentType) => {
  try {
    logger.info('Начинаем OpenAI Vision OCR распознавание', {
      filePath,
      documentType
    });

    // Проверяем наличие OpenAI API ключа
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API ключ не настроен. Пожалуйста, добавьте OPENAI_API_KEY в переменные окружения.');
    }

    // Используем только OpenAI Vision API
    const result = await processDocumentWithOCR(filePath, documentType);
      
      logger.info('OpenAI Vision OCR успешно завершен', {
        documentType: result.documentType,
        confidence: result.confidence,
        extractedFields: Object.keys(result.extractedData || {}).length,
        recognizedTextLength: result.recognizedText ? result.recognizedText.length : 0
      });
      
      return result;
    
  } catch (error) {
    logger.error('Ошибка OpenAI Vision OCR распознавания', {
      error: error.message,
      filePath,
      documentType
    });
    throw error;
  }
};

module.exports = {
  processDocument,
  performRealOCR
}; 