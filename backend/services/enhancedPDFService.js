const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { performBatchOCR } = require('./enhancedOCRService');

/**
 * Enhanced PDF processing service
 * Handles both text-based and scanned PDFs
 */

/**
 * Extract text from PDF document
 * Automatically determines if PDF is text-based or scanned
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<Object>} Extracted text and metadata
 */
async function extractTextFromPDF(pdfPath) {
  const startTime = Date.now();

  try {
    logger.info('Starting PDF text extraction', { pdfPath });

    // Read PDF file
    const dataBuffer = await fs.readFile(pdfPath);
    
    // Try text extraction first (for text-based PDFs)
    const pdfData = await pdfParse(dataBuffer, {
      max: 0, // Parse all pages
      pagerender: renderPage
    });

    const extractedText = pdfData.text.trim();
    const pageCount = pdfData.numpages;

    // Check if PDF contains meaningful text
    const isTextBased = extractedText.length > 100;

    let finalText = extractedText;
    let extractionMethod = 'text-extraction';
    let confidence = 0.9;

    // If PDF appears to be scanned or has insufficient text, use OCR
    if (!isTextBased) {
      logger.info('PDF appears to be scanned, using OCR', { pdfPath });
      
      // This would require converting PDF pages to images
      // For now, we'll use the existing text extraction
      // In production, you'd use pdf2image or similar
      extractionMethod = 'ocr-required';
      confidence = 0.3;
      
      logger.warn('OCR for scanned PDFs requires additional setup (pdf2image)', { pdfPath });
    }

    const duration = Date.now() - startTime;
    logger.info('PDF text extraction completed', {
      duration: `${duration}ms`,
      pages: pageCount,
      textLength: finalText.length,
      method: extractionMethod,
      confidence
    });

    return {
      text: finalText,
      pages: pageCount,
      confidence,
      metadata: {
        method: extractionMethod,
        processingTime: duration,
        isTextBased,
        info: pdfData.info
      }
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('PDF text extraction failed', {
      error: error.message,
      pdfPath,
      duration: `${duration}ms`
    });

    return {
      text: '',
      pages: 0,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Custom page rendering function for better text extraction
 * @param {Object} pageData - PDF page data
 * @returns {Promise<string>} Rendered page text
 */
async function renderPage(pageData) {
  // Custom text rendering logic
  let renderOptions = {
    normalizeWhitespace: true,
    disableCombineTextItems: false
  };

  return pageData.getTextContent(renderOptions)
    .then(textContent => {
      let lastY, text = '';
      
      for (let item of textContent.items) {
        // Add line breaks based on Y position
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      
      return text;
    });
}

/**
 * Analyze PDF structure and extract metadata
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<Object>} PDF metadata and structure info
 */
async function analyzePDFStructure(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdfParse(dataBuffer);

    return {
      pages: pdfData.numpages,
      info: pdfData.info || {},
      metadata: pdfData.metadata || {},
      version: pdfData.version,
      hasText: pdfData.text.length > 0
    };
  } catch (error) {
    logger.error('PDF structure analysis failed', { error: error.message });
    return null;
  }
}

/**
 * Process PDF for legal document analysis
 * Combines text extraction with quality checks
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<Object>} Processed PDF data ready for analysis
 */
async function processPDFForAnalysis(pdfPath) {
  try {
    logger.info('Processing PDF for legal analysis', { pdfPath });

    // Extract text
    const extraction = await extractTextFromPDF(pdfPath);
    
    // Analyze structure
    const structure = await analyzePDFStructure(pdfPath);

    // Determine quality and readiness for analysis
    const isReadyForAnalysis = extraction.text.length > 50 && extraction.confidence > 0.5;

    return {
      text: extraction.text,
      confidence: extraction.confidence,
      pages: extraction.pages,
      structure,
      isReadyForAnalysis,
      recommendations: isReadyForAnalysis 
        ? [] 
        : ['Документ требует дополнительной обработки или OCR']
    };

  } catch (error) {
    logger.error('PDF processing for analysis failed', { error: error.message });
    return {
      text: '',
      confidence: 0,
      pages: 0,
      isReadyForAnalysis: false,
      error: error.message
    };
  }
}

module.exports = {
  extractTextFromPDF,
  analyzePDFStructure,
  processPDFForAnalysis
};



