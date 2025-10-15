const logger = require('../utils/logger');
const documentService = require('../services/documentService');
const { performAdvancedDocumentAnalysis, generateAnalysisReport } = require('../services/advancedDocumentAnalysisService');

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
      
      res.json({
        success: true,
        message: 'Документ успешно обработан',
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

  async handleAdvancedDocumentAnalysis(req, res) {
    try {
      logger.info('Advanced document analysis request received');
      
      const { documentText, documentType = 'legal', fileName = 'document' } = req.body;
      
      if (!documentText) {
        return res.status(400).json({ 
          error: 'Текст документа не найден' 
        });
      }

      logger.info('Starting advanced analysis', {
        textLength: documentText.length,
        documentType,
        fileName
      });

      // Выполняем расширенный анализ
      const analysis = await performAdvancedDocumentAnalysis(documentText, documentType, fileName);
      
      // Генерируем отчет
      const report = generateAnalysisReport(analysis, fileName);

      // Persist analysis result
      const fs = require('fs');
      const path = require('path');
      const analysisFilePath = path.resolve(__dirname, '../data/analysis.json');
      let analysisStore = { items: [] };
      if (fs.existsSync(analysisFilePath)) {
        analysisStore = JSON.parse(fs.readFileSync(analysisFilePath, 'utf8'));
      }
      const docId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
      const newEntry = {
        id: docId,
        userId: req.body.userId || null,
        analysis,
        report,
        metadata: { analyzedAt: new Date().toISOString(), textLength: documentText.length, documentType, fileName, docId }
      };
      analysisStore.items.push(newEntry);
      fs.writeFileSync(analysisFilePath, JSON.stringify(analysisStore, null, 2));
      // Append docId to response metadata
      res.json({
        success: true,
        message: 'Расширенный анализ документа завершен',
        data: {
          analysis,
          report,
          metadata: { analyzedAt: new Date().toISOString(), textLength: documentText.length, documentType, fileName, docId }
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
      const fs = require('fs');
      const path = require('path');
      const analysisFilePath = path.resolve(__dirname, '../data/analysis.json');
      if (!fs.existsSync(analysisFilePath)) {
        return res.status(404).json({ error: 'Analysis store not found' });
      }
      const store = JSON.parse(fs.readFileSync(analysisFilePath, 'utf8'));
      const entry = store.items.find(item => item.id === req.params.docId);
      if (!entry) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      res.json({ success: true, data: entry });
    } catch (error) {
      logger.error('Error retrieving analysis:', error);
      res.status(500).json({ error: 'Error retrieving analysis' });
    }
  }

  // List all saved analyses
  async handleListAnalysis(req, res) {
    try {
      const fs = require('fs');
      const path = require('path');
      const analysisFilePath = path.resolve(__dirname, '../data/analysis.json');
      if (!fs.existsSync(analysisFilePath)) {
        return res.json({ success: true, data: [] });
      }
      const store = JSON.parse(fs.readFileSync(analysisFilePath, 'utf8'));
      // Return only metadata for selection
      const list = store.items.map(item => ({ id: item.id, metadata: item.metadata }));
      res.json({ success: true, data: list });
    } catch (error) {
      logger.error('Error listing analyses:', error);
      res.status(500).json({ error: 'Error listing analyses' });
    }
  }
}

module.exports = new DocumentController(); 