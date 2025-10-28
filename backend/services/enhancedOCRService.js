const OpenAI = require('openai');
const sharp = require('sharp');
const config = require('../config/config');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Enhanced OCR Service with image preprocessing
 * Uses OpenAI Vision API for superior text recognition
 */

/**
 * Preprocess image for optimal OCR results
 * @param {string|Buffer} imagePath - Path to image or Buffer
 * @returns {Promise<Buffer>} Preprocessed image buffer
 */
async function preprocessImage(imagePath) {
  try {
    let imageBuffer;
    
    // Load image
    if (Buffer.isBuffer(imagePath)) {
      imageBuffer = imagePath;
    } else {
      imageBuffer = await fs.readFile(imagePath);
    }

    // Apply preprocessing pipeline
    const processed = await sharp(imageBuffer)
      // Resize if too large (max 2000px on longest side)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      // Enhance contrast and sharpness
      .normalize()
      .sharpen()
      // Convert to grayscale for better text recognition
      .grayscale()
      // Increase brightness slightly
      .modulate({ brightness: 1.1 })
      // Save as high-quality JPEG
      .jpeg({ quality: 95 })
      .toBuffer();

    logger.info('Image preprocessing completed', {
      originalSize: imageBuffer.length,
      processedSize: processed.length
    });

    return processed;
  } catch (error) {
    logger.error('Image preprocessing failed', { error: error.message });
    // Return original if preprocessing fails
    return Buffer.isBuffer(imagePath) ? imagePath : await fs.readFile(imagePath);
  }
}

/**
 * Perform OCR on image using OpenAI Vision
 * @param {string|Buffer} imagePath - Path to image file or image buffer
 * @param {string} documentType - Type of document (for context)
 * @returns {Promise<Object>} OCR result with text and confidence
 */
async function performOCR(imagePath, documentType = 'legal') {
  const startTime = Date.now();

  try {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    logger.info('Starting enhanced OCR', { documentType });

    // Preprocess image for better OCR
    const processedImage = await preprocessImage(imagePath);
    const base64Image = processedImage.toString('base64');

    // Use OpenAI Vision for text extraction
    const response = await openai.chat.completions.create({
      model: config.openai.visionModel || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Ты — профессиональный специалист по распознаванию текста. Извлеки ВЕСЬ текст из изображения с максимальной точностью, сохраняя структуру и форматирование.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Извлеки весь текст из этого ${documentType === 'legal' ? 'юридического' : ''} документа. Сохрани структуру, абзацы, списки. Верни только текст без комментариев.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1 // Low temperature for accurate text extraction
    });

    const recognizedText = response.choices[0]?.message?.content?.trim() || '';
    
    // Estimate confidence based on response quality
    const confidence = estimateConfidence(recognizedText);

    const duration = Date.now() - startTime;
    logger.info('Enhanced OCR completed', {
      duration: `${duration}ms`,
      textLength: recognizedText.length,
      confidence
    });

    return {
      recognizedText,
      confidence,
      metadata: {
        method: 'openai-vision',
        model: config.openai.visionModel || 'gpt-4o',
        processingTime: duration
      }
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Enhanced OCR failed', {
      error: error.message,
      duration: `${duration}ms`
    });

    return {
      recognizedText: '',
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Batch OCR for multiple images (e.g., multi-page documents)
 * @param {Array<string|Buffer>} images - Array of image paths or buffers
 * @param {string} documentType - Type of document
 * @returns {Promise<Object>} Combined OCR result
 */
async function performBatchOCR(images, documentType = 'legal') {
  const startTime = Date.now();
  
  try {
    logger.info('Starting batch OCR', { imageCount: images.length });

    // Process images in parallel (max 3 concurrent to avoid rate limits)
    const batchSize = 3;
    const results = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(img => performOCR(img, documentType))
      );
      results.push(...batchResults);
      
      // Small delay to avoid rate limiting
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Combine all recognized text
    const combinedText = results
      .map((r, idx) => `\n--- Страница ${idx + 1} ---\n${r.recognizedText}`)
      .join('\n');

    // Calculate average confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    const duration = Date.now() - startTime;
    logger.info('Batch OCR completed', {
      duration: `${duration}ms`,
      pages: results.length,
      totalTextLength: combinedText.length,
      avgConfidence
    });

    return {
      recognizedText: combinedText,
      confidence: avgConfidence,
      pages: results.length,
      metadata: {
        method: 'openai-vision-batch',
        processingTime: duration
      }
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Batch OCR failed', {
      error: error.message,
      duration: `${duration}ms`
    });

    return {
      recognizedText: '',
      confidence: 0,
      pages: 0,
      error: error.message
    };
  }
}

/**
 * Process each document OCR in parallel, returning individual results
 * @param {Array<string>} filePaths - Array of file paths
 * @param {string} documentType - Type of document
 * @returns {Promise<Array>} Array of OCR results, one per document
 */
async function performPerDocumentBatchOCR(filePaths, documentType = 'legal') {
  const startTime = Date.now();
  
  try {
    logger.info('Starting per-document batch OCR', { documentCount: filePaths.length });

    // Process documents in parallel (max 3 concurrent to avoid rate limits)
    const batchSize = 3;
    const results = [];

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(filePath => performOCR(filePath, documentType))
      );
      results.push(...batchResults);
      
      // Small delay to avoid rate limiting
      if (i + batchSize < filePaths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Per-document batch OCR completed', {
      duration: `${duration}ms`,
      documentCount: results.length,
      totalTextLength: results.reduce((sum, r) => sum + r.recognizedText.length, 0),
      avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    });

    return results; // Return array of results, one per document

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Per-document batch OCR failed', {
      error: error.message,
      duration: `${duration}ms`
    });

    return [];
  }
}

/**
 * Estimate OCR confidence based on text quality indicators
 * @param {string} text - Recognized text
 * @returns {number} Confidence score (0-1)
 */
function estimateConfidence(text) {
  if (!text || text.length === 0) return 0;

  let score = 0.5; // Base score

  // Length indicator
  if (text.length > 100) score += 0.1;
  if (text.length > 500) score += 0.1;

  // Check for common Russian legal terms
  const legalTerms = ['статья', 'закон', 'суд', 'истец', 'ответчик', 'договор'];
  const hasLegalTerms = legalTerms.some(term => 
    text.toLowerCase().includes(term)
  );
  if (hasLegalTerms) score += 0.2;

  // Check for proper sentence structure
  const hasPunctuation = /[.!?]/.test(text);
  if (hasPunctuation) score += 0.1;

  return Math.min(score, 1.0);
}

module.exports = {
  performOCR,
  performBatchOCR,
  performPerDocumentBatchOCR,
  preprocessImage
};

