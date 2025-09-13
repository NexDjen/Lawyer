const logger = require('../utils/logger');
const documentService = require('../services/documentService');

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
}

module.exports = new DocumentController(); 