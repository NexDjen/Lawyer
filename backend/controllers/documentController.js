const logger = require('../utils/logger');
const documentService = require('../services/documentService');
const { performAdvancedDocumentAnalysis, performBatchDocumentAnalysis, generateAnalysisReport } = require('../services/advancedDocumentAnalysisService');
const documentStorageService = require('../services/documentStorageService');

class DocumentController {
  async handleDocumentUpload(req, res) {
    try {
      logger.info('Document upload request received');
      
      if (!req.file) {
        return res.status(400).json({ 
          error: 'Файл не найден' 
        });
      }

      const result = await documentService.processDocument(req.file);
      
      // Include recognizedText at top-level for frontend
      const { recognizedText } = result;
      res.json({
        success: true,
        message: 'Документ успешно обработан',
        recognizedText,
        data: result
      });
      
    } catch (error) {
      logger.error('Error in document upload:', error);
      res.status(500).json({ 
        error: 'Ошибка при обработке документа' 
      });
    }
  }

  async handleDocumentGeneration(req, res) {
    try {
      logger.info('Document generation request received');
      
      const { type, data } = req.body;
      
      if (!type || !data) {
        return res.status(400).json({ 
          error: 'Необходимо указать тип документа и данные' 
        });
      }

      const document = await documentService.generateDocument(type, data);
      
      res.json({
        success: true,
        message: 'Документ успешно сгенерирован',
        data: document
      });
      
    } catch (error) {
      logger.error('Error in document generation:', error);
      res.status(500).json({ 
        error: 'Ошибка при генерации документа' 
      });
    }
  }

  async handleDocumentAnalysis(req, res) {
    try {
      logger.info('Document analysis request received');
      
      if (!req.file) {
        return res.status(400).json({ 
          error: 'Файл не найден' 
        });
      }

      const analysis = await documentService.analyzeDocument(req.file);
      
      res.json({
        success: true,
        message: 'Анализ документа завершен',
        data: analysis
      });
      
    } catch (error) {
      logger.error('Error in document analysis:', error);
      res.status(500).json({ 
        error: 'Ошибка при анализе документа' 
      });
    }
  }

  async handleBatchDocumentAnalysis(req, res) {
    try {
      logger.info('Batch document analysis request received');
      
      const { documents, userId } = req.body;
      
      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({ 
          error: 'Список документов не найден или пуст' 
        });
      }

      // Validate each document has required fields
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        if (!doc.documentText || !doc.fileName) {
          return res.status(400).json({ 
            error: `Документ ${i + 1} не содержит обязательные поля: documentText и fileName` 
          });
        }
      }

      logger.info('Starting batch analysis', {
        documentCount: documents.length,
        documentNames: documents.map(d => d.fileName),
        userId
      });

      // Perform batch analysis
      const analysis = await performBatchDocumentAnalysis(documents);
      
      // Generate report
      const report = generateAnalysisReport(analysis, `Набор документов (${documents.length})`);

      // Save batch analysis to database
      const database = require('../database/database');
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const currentUserId = userId || '1';
      
      try {
        await database.run(
          `INSERT INTO document_analyses (
            id, user_id, document_id, analysis_type, analysis_result,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            batchId,
            currentUserId,
            null, // No single document ID for batch
            'batch',
            JSON.stringify(analysis),
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
        
        logger.info('Batch analysis saved to database', { batchId, userId: currentUserId });
      } catch (err) {
        logger.warn('Failed to save batch analysis to database', { error: err.message });
      }

      res.json({
        success: true,
        message: 'Групповой анализ документов завершен',
        data: {
          analysis,
          report,
          batchId,
          documentCount: documents.length
        }
      });
      
    } catch (error) {
      logger.error('Error in batch document analysis:', error);
      res.status(500).json({ 
        error: 'Ошибка при групповом анализе документов' 
      });
    }
  }

  async handleAdvancedDocumentAnalysis(req, res) {
    try {
      logger.info('Advanced document analysis request received');
      
      const { documentText, documentType = 'legal', fileName = 'document', userId } = req.body;
      
      if (!documentText) {
        return res.status(400).json({ 
          error: 'Текст документа не найден' 
        });
      }

      logger.info('Starting advanced analysis', {
        textLength: documentText.length,
        documentType,
        fileName,
        userId
      });

      // Сначала сохраняем документ в БД
      const database = require('../database/database');
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      
      const currentUserId = userId || '1';
      
      // Сохраняем документ в таблицу documents (игнорируем ошибки FK)
      try {
        await database.run(
          `INSERT INTO documents (
            id, user_id, filename, original_name, file_path,
            file_size, mime_type, document_type, extracted_text,
            ocr_confidence, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            documentId,
            currentUserId,
            fileName,
            fileName,
            '',
            documentText.length,
            'text/plain',
            documentType,
            documentText,
            1.0,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
      } catch (err) {
        logger.warn('Failed to insert document, continuing analysis', { error: err.message });
      }

      // Выполняем расширенный анализ
      const analysis = await performAdvancedDocumentAnalysis(documentText, documentType, fileName);
      
      // Генерируем отчет
      const report = generateAnalysisReport(analysis, fileName);

      // Persist analysis result to database с привязкой к документу
      const analysisService = require('../services/analysisService');
      const analysisId = await analysisService.saveAnalysis(
        currentUserId,
        documentId,  // ← Теперь передаем существующий документ
        { analysis, report }
      );
      
      logger.info('Analysis saved successfully', { analysisId, documentId, userId: currentUserId });
      
      // Append docId to response metadata
      res.json({
        success: true,
        message: 'Расширенный анализ документа завершен',
        data: {
          analysis,
          report,
          metadata: { 
            analyzedAt: new Date().toISOString(), 
            textLength: documentText.length, 
            documentType, 
            fileName, 
            docId: analysisId,
            documentId: documentId
          }
        }
      });
      
    } catch (error) {
      logger.error('Error in advanced document analysis:', error);
      res.status(500).json({ 
        error: 'Ошибка при расширенном анализе документа',
        details: error.message
      });
    }
  }

  async handleGetAnalysis(req, res) {
    try {
      const analysisService = require('../services/analysisService');
      const analysis = await analysisService.getAnalysisById(req.params.docId);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      
      res.json({ success: true, data: analysis });
    } catch (error) {
      logger.error('Error retrieving analysis:', error);
      res.status(500).json({ error: 'Error retrieving analysis' });
    }
  }

  // List all saved analyses
  async handleListAnalysis(req, res) {
    try {
      const analysisService = require('../services/analysisService');
      const analyses = await analysisService.getAllAnalyses();
      res.json({ success: true, data: analyses });
    } catch (error) {
      logger.error('Error listing analyses:', error);
      res.status(500).json({ error: 'Error listing analyses' });
    }
  }

  // Save document to database
  async handleSaveDocument(req, res) {
    try {
      logger.info('Save document request received');
      
      const { userId, documentData } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          error: 'User ID is required' 
        });
      }

      if (!documentData) {
        return res.status(400).json({ 
          error: 'Document data is required' 
        });
      }

      const savedDocument = await documentStorageService.saveDocument(userId, documentData);
      
      res.json({
        success: true,
        message: 'Document saved successfully',
        data: savedDocument
      });
      
    } catch (error) {
      logger.error('Error saving document:', error);
      res.status(500).json({ 
        error: 'Error saving document',
        details: error.message
      });
    }
  }

  // Get user documents
  async handleGetUserDocuments(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ 
          error: 'User ID is required' 
        });
      }

      const documents = await documentStorageService.getUserDocuments(userId);
      
      res.json({
        success: true,
        data: documents
      });
      
    } catch (error) {
      logger.error('Error getting user documents:', error);
      res.status(500).json({ 
        error: 'Error getting user documents',
        details: error.message
      });
    }
  }

  // Get single document
  async handleGetDocument(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          error: 'Document ID is required' 
        });
      }

      const document = await documentStorageService.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({ 
          error: 'Document not found' 
        });
      }
      
      res.json({
        success: true,
        data: document
      });
      
    } catch (error) {
      logger.error('Error getting document:', error);
      res.status(500).json({ 
        error: 'Error getting document',
        details: error.message
      });
    }
  }

  // Delete document
  async handleDeleteDocument(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          error: 'Document ID is required' 
        });
      }

      const deleted = await documentStorageService.deleteDocument(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Document not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
      
    } catch (error) {
      logger.error('Error deleting document:', error);
      res.status(500).json({ 
        error: 'Error deleting document',
        details: error.message
      });
    }
  }

  // Migrate localStorage documents
  async handleMigrateDocuments(req, res) {
    try {
      const { userId, documents } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          error: 'User ID is required' 
        });
      }

      if (!documents || !Array.isArray(documents)) {
        return res.status(400).json({ 
          error: 'Documents array is required' 
        });
      }

      const result = await documentStorageService.migrateLocalStorageDocuments(userId, documents);
      
      res.json({
        success: true,
        message: 'Documents migrated successfully',
        data: result
      });
      
    } catch (error) {
      logger.error('Error migrating documents:', error);
      res.status(500).json({ 
        error: 'Error migrating documents',
        details: error.message
      });
    }
  }
  // Получить документ по ID
  async getDocumentById(id) {
    try {
      logger.info('Getting document by ID:', { id });
      
      // Сначала попробуем из JSON файла
      const fs = require('fs');
      const path = require('path');
      const documentsPath = path.resolve(__dirname, '../data/documents.json');
      
      logger.info('Looking for document in JSON file:', { 
        id, 
        documentsPath,
        fileExists: fs.existsSync(documentsPath)
      });
      
      if (fs.existsSync(documentsPath)) {
        const documentsData = JSON.parse(fs.readFileSync(documentsPath, 'utf8'));
        logger.info('JSON file loaded:', { 
          hasItems: !!documentsData.items,
          itemsCount: documentsData.items ? documentsData.items.length : 0,
          firstItemId: documentsData.items ? documentsData.items[0]?.id : 'none'
        });
        
        const document = documentsData.items ? documentsData.items.find(doc => doc.id === id) : documentsData.find(doc => doc.id === id);
        
        if (document) {
          logger.info('Document found in JSON file:', { 
            id: document.id, 
            name: document.name || document.filename || 'Unknown'
          });
          return document;
        } else {
          logger.warn('Document not found in JSON file:', { 
            id,
            availableIds: documentsData.items ? documentsData.items.slice(0, 3).map(doc => doc.id) : []
          });
        }
      }
      
      // Если не найден в JSON, попробуем из SQLite базы данных
      try {
        const db = require('../database/database');
        
        const document = await db.get(
          'SELECT * FROM documents WHERE id = ?',
          [id]
        );
        
        if (document) {
          // Парсим JSON поля
          if (document.analysis_result) {
            try {
              document.analysis = JSON.parse(document.analysis_result);
            } catch (e) {
              logger.warn('Failed to parse analysis_result JSON:', e.message);
              document.analysis = {};
            }
          }
          
          if (document.metadata) {
            try {
              document.metadata = JSON.parse(document.metadata);
            } catch (e) {
              logger.warn('Failed to parse metadata JSON:', e.message);
              document.metadata = {};
            }
          }
          
          logger.info('Document found in database:', { 
            id: document.id, 
            name: document.filename || document.original_name,
            hasAnalysis: !!document.analysis
          });
          
          return document;
        }
      } catch (dbError) {
        logger.warn('Database access failed:', dbError.message);
      }
      
      logger.warn('Document not found:', { id });
      return null;
      
    } catch (error) {
      logger.error('Error getting document by ID:', error);
      return null;
    }
  }

  /**
   * Handle batch document analysis with OCR and LLM
   * Flow: Multiple files -> OCR in parallel -> LLM analysis -> Save as case
   */
  async handleBatchOCRAnalysis(req, res) {
    try {
      logger.info('Batch OCR analysis request received');

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files provided for batch analysis'
        });
      }

      const userId = req.body?.userId || req.user?.id || '1';
      const options = {
        caseName: req.body?.caseName || null,
        caseNumber: req.body?.caseNumber || null,
        description: req.body?.description || null,
        documentType: req.body?.documentType || 'legal'
      };

      logger.info('Starting batch analysis', {
        fileCount: req.files.length,
        userId,
        caseName: options.caseName
      });

      const batchAnalysisService = require('../services/batchDocumentAnalysisService');
      const result = await batchAnalysisService.processBatchDocuments(
        req.files,
        userId,
        options
      );

      res.json({
        success: true,
        message: 'Batch analysis completed successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error in batch OCR analysis:', error);
      res.status(500).json({
        error: 'Batch analysis failed',
        details: error.message
      });
    }
  }

  /**
   * Get batch case by ID
   */
  async getBatchCase(req, res) {
    try {
      const { caseId } = req.params;
      const batchAnalysisService = require('../services/batchDocumentAnalysisService');
      const caseData = await batchAnalysisService.getBatchCase(caseId);

      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      res.json({
        success: true,
        data: caseData
      });
    } catch (error) {
      logger.error('Error getting batch case:', error);
      res.status(500).json({
        error: 'Failed to retrieve case',
        details: error.message
      });
    }
  }

  /**
   * List batch cases for a user
   */
  async listBatchCases(req, res) {
    try {
      const userId = req.query?.userId || req.user?.id || '1';
      const limit = parseInt(req.query?.limit || '50', 10);
      const offset = parseInt(req.query?.offset || '0', 10);

      const batchAnalysisService = require('../services/batchDocumentAnalysisService');
      const cases = await batchAnalysisService.listBatchCases(userId, {
        limit,
        offset
      });

      res.json({
        success: true,
        data: cases,
        count: cases.length
      });
    } catch (error) {
      logger.error('Error listing batch cases:', error);
      res.status(500).json({
        error: 'Failed to list cases',
        details: error.message
      });
    }
  }
}

module.exports = new DocumentController(); 