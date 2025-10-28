const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { performPerDocumentBatchOCR } = require('./enhancedOCRService');
const { performBatchDocumentAnalysis } = require('./advancedDocumentAnalysisService');
const documentStorageService = require('./documentStorageService');

/**
 * Comprehensive batch document analysis service
 * Flow: Multiple files -> OCR all in parallel -> Combine text -> Send to LLM -> Save as case
 */
class BatchDocumentAnalysisService {
  /**
   * Process multiple documents with OCR and LLM analysis
   * @param {Array<Object>} files - Array of file objects from multer
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Complete analysis result with case icon
   */
  async processBatchDocuments(files, userId, options = {}) {
    const startTime = Date.now();
    const {
      documentType = 'legal',
      caseName = null,
      caseNumber = null,
      description = null
    } = options;

    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new Error('No files provided for batch processing');
      }

      logger.info('Starting batch document analysis', {
        fileCount: files.length,
        userId,
        documentType,
        caseName
      });

      // STEP 1: Extract file paths
      const filePaths = files.map(file => file.path);

      // STEP 2: Perform OCR on each file in parallel (returns individual results)
      logger.info('🔄 Step 1: Starting parallel OCR for all files...');
      const ocrResultsPerDocument = await performPerDocumentBatchOCR(filePaths, documentType);

      if (!ocrResultsPerDocument || ocrResultsPerDocument.length === 0) {
        throw new Error('OCR processing failed - no text extracted');
      }

      logger.info('✅ Step 1: Parallel OCR completed', {
        documentsProcessed: ocrResultsPerDocument.length,
        avgConfidence: (ocrResultsPerDocument.reduce((sum, r) => sum + r.confidence, 0) / ocrResultsPerDocument.length).toFixed(2)
      });

      // STEP 3: Prepare documents for LLM analysis (each document with its own OCR text)
      logger.info('📝 Step 2: Preparing documents for LLM analysis...');
      
      const documentsForAnalysis = files.map((file, index) => ({
        fileName: file.originalname,
        documentText: ocrResultsPerDocument[index]?.recognizedText || '',
        documentType: documentType
      }));

      // Combine all files into a SINGLE analysis request to LLM
      logger.info('🤖 Step 2: Sending combined documents to LLM for comprehensive analysis...');
      const llmAnalysis = await performBatchDocumentAnalysis(
        documentsForAnalysis
      );

      if (!llmAnalysis) {
        throw new Error('LLM analysis failed');
      }

      logger.info('✅ Step 2: LLM analysis completed', {
        risksCount: llmAnalysis.risks?.length || 0,
        recommendationsCount: llmAnalysis.recommendations?.length || 0,
        errorsCount: llmAnalysis.legalErrors?.length || 0
      });

      // STEP 4: Save batch analysis with case icon marker
      logger.info('💾 Step 3: Saving batch analysis as case');
      
      const combinedOcrResult = {
        pages: ocrResultsPerDocument.length,
        confidence: ocrResultsPerDocument.reduce((sum, r) => sum + r.confidence, 0) / ocrResultsPerDocument.length,
        recognizedText: documentsForAnalysis.map(d => d.documentText).join('\n---\n'),
        metadata: {
          method: 'openai-vision-batch-per-document',
          processingTime: Date.now() - startTime
        }
      };

      const caseAnalysis = await this.saveBatchAnalysisAsCase(
        userId,
        files,
        combinedOcrResult,
        llmAnalysis,
        {
          caseName,
          caseNumber,
          description,
          documentType
        }
      );

      const duration = Date.now() - startTime;
      logger.info('✅ Batch document analysis completed successfully', {
        caseId: caseAnalysis.caseId,
        duration: `${duration}ms`,
        fileCount: files.length
      });

      return {
        success: true,
        caseId: caseAnalysis.caseId,
        caseName: caseAnalysis.caseName,
        totalFiles: files.length,
        ocrResult: {
          totalPages: combinedOcrResult.pages,
          confidence: combinedOcrResult.confidence,
          textLength: combinedOcrResult.recognizedText.length
        },
        analysis: llmAnalysis,
        metadata: {
          processedAt: new Date().toISOString(),
          processingTime: `${duration}ms`,
          icon: 'briefcase' // Special icon for batch cases
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Batch document analysis failed', {
        error: error.message,
        fileCount: files?.length || 0,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Save batch analysis as a unified case with case icon
   * @param {string} userId - User ID
   * @param {Array<Object>} files - Original files
   * @param {Object} ocrResults - Combined OCR results
   * @param {Object} llmAnalysis - LLM analysis results
   * @param {Object} caseInfo - Case metadata
   * @returns {Promise<Object>} Saved case data
   */
  async saveBatchAnalysisAsCase(userId, files, ocrResults, llmAnalysis, caseInfo) {
    try {
      const caseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const caseData = {
        caseId,
        caseName: caseInfo.caseName || `Case: ${files.map(f => f.originalname).join(', ')}`,
        caseNumber: caseInfo.caseNumber || null,
        description: caseInfo.description || `Batch analysis of ${files.length} documents`,
        fileCount: files.length,
        fileNames: files.map(f => f.originalname),
        documentType: caseInfo.documentType,
        icon: 'briefcase', // Special case icon marker
        ocrMetadata: {
          totalPages: ocrResults.pages,
          confidence: ocrResults.confidence,
          method: ocrResults.metadata?.method || 'openai-vision-batch'
        },
        analysis: llmAnalysis,
        createdAt: new Date().toISOString(),
        userId
      };

      // Save to database using documentStorageService
      await documentStorageService.saveBatchCase(userId, caseData);

      logger.info('Case saved successfully', {
        caseId,
        caseName: caseData.caseName,
        fileCount: files.length
      });

      return caseData;

    } catch (error) {
      logger.error('Error saving batch case', { error: error.message });
      throw error;
    }
  }

  /**
   * Retrieve batch case by ID
   * @param {string} caseId - Case ID
   * @returns {Promise<Object>} Case data
   */
  async getBatchCase(caseId) {
    try {
      return await documentStorageService.getBatchCase(caseId);
    } catch (error) {
      logger.error('Error retrieving batch case', { error: error.message });
      throw error;
    }
  }

  /**
   * List all batch cases for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of batch cases
   */
  async listBatchCases(userId) {
    try {
      return await documentStorageService.listBatchCases(userId);
    } catch (error) {
      logger.error('Error listing batch cases', { error: error.message });
      throw error;
    }
  }
}

module.exports = new BatchDocumentAnalysisService();
