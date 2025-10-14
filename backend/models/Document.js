const database = require('../database/database');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class Document {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.filename = data.filename;
    this.originalName = data.original_name;
    this.filePath = data.file_path;
    this.fileSize = data.file_size;
    this.mimeType = data.mime_type;
    this.documentType = data.document_type;
    this.extractedText = data.extracted_text;
    this.ocrConfidence = data.ocr_confidence;
    this.analysisResult = data.analysis_result;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.isDeleted = data.is_deleted;
  }

  // Создание нового документа
  static async create(documentData) {
    try {
      const {
        userId,
        filename,
        originalName,
        filePath,
        fileSize,
        mimeType,
        documentType = 'unknown',
        extractedText = '',
        ocrConfidence = null,
        analysisResult = null
      } = documentData;

      const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await database.run(`
        INSERT INTO documents (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, document_type, extracted_text, ocr_confidence, 
          analysis_result, created_at, updated_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
      `, [
        id, userId, filename, originalName, filePath, fileSize,
        mimeType, documentType, extractedText, ocrConfidence,
        analysisResult ? JSON.stringify(analysisResult) : null
      ]);

      logger.info('✅ Документ создан:', { id, userId, filename, documentType });
      return await Document.findById(id);
    } catch (error) {
      logger.error('Ошибка создания документа:', error);
      throw error;
    }
  }

  // Поиск документа по ID
  static async findById(id) {
    try {
      const document = await database.get(`
        SELECT * FROM documents WHERE id = ? AND is_deleted = 0
      `, [id]);
      
      return document ? new Document(document) : null;
    } catch (error) {
      logger.error('Ошибка поиска документа по ID:', error);
      throw error;
    }
  }

  // Получение документов пользователя
  static async findByUserId(userId, limit = 50, offset = 0, documentType = null) {
    try {
      let sql = `
        SELECT * FROM documents 
        WHERE user_id = ? AND is_deleted = 0
      `;
      const params = [userId];

      if (documentType) {
        sql += ` AND document_type = ?`;
        params.push(documentType);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const documents = await database.all(sql, params);
      return documents.map(doc => new Document(doc));
    } catch (error) {
      logger.error('Ошибка получения документов пользователя:', error);
      throw error;
    }
  }

  // Поиск документов по типу
  static async findByType(documentType, limit = 50, offset = 0) {
    try {
      const documents = await database.all(`
        SELECT * FROM documents 
        WHERE document_type = ? AND is_deleted = 0
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [documentType, limit, offset]);
      
      return documents.map(doc => new Document(doc));
    } catch (error) {
      logger.error('Ошибка поиска документов по типу:', error);
      throw error;
    }
  }

  // Обновление документа
  async update(updateData) {
    try {
      const allowedFields = [
        'extracted_text', 'ocr_confidence', 'analysis_result', 
        'document_type', 'filename'
      ];
      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'analysis_result' && typeof value === 'object') {
            updates.push(`${key} = ?`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = ?`);
            values.push(value);
          }
        }
      }

      if (updates.length === 0) {
        return this;
      }

      values.push(this.id);
      
      await database.run(`
        UPDATE documents 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, values);

      logger.info('✅ Документ обновлен:', { id: this.id, updates });
      return await Document.findById(this.id);
    } catch (error) {
      logger.error('Ошибка обновления документа:', error);
      throw error;
    }
  }

  // Мягкое удаление документа
  async delete() {
    try {
      await database.run(`
        UPDATE documents 
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [this.id]);

      logger.info('✅ Документ удален:', { id: this.id });
      return true;
    } catch (error) {
      logger.error('Ошибка удаления документа:', error);
      throw error;
    }
  }

  // Физическое удаление документа и файла
  async deletePermanently() {
    try {
      // Удаляем файл с диска
      if (this.filePath && fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
        logger.info('Файл удален с диска:', this.filePath);
      }

      // Удаляем OCR результаты
      await database.run(`
        DELETE FROM ocr_results WHERE document_id = ?
      `, [this.id]);

      // Удаляем документ из базы
      await database.run(`
        DELETE FROM documents WHERE id = ?
      `, [this.id]);

      logger.info('✅ Документ полностью удален:', { id: this.id });
      return true;
    } catch (error) {
      logger.error('Ошибка полного удаления документа:', error);
      throw error;
    }
  }

  // Сохранение OCR результата
  async saveOCRResult(ocrData) {
    try {
      const { extractedData, confidence, processingTime } = ocrData;
      
      const ocrId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await database.run(`
        INSERT INTO ocr_results (id, document_id, extracted_data, confidence, processing_time, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [ocrId, this.id, JSON.stringify(extractedData), confidence, processingTime]);

      // Обновляем документ с результатами OCR
      await this.update({
        extracted_text: extractedData.text || '',
        ocr_confidence: confidence
      });

      logger.info('✅ OCR результат сохранен:', { ocrId, documentId: this.id });
      return ocrId;
    } catch (error) {
      logger.error('Ошибка сохранения OCR результата:', error);
      throw error;
    }
  }

  // Получение OCR результатов документа
  async getOCRResults() {
    try {
      const results = await database.all(`
        SELECT * FROM ocr_results 
        WHERE document_id = ?
        ORDER BY created_at DESC
      `, [this.id]);
      
      return results.map(result => ({
        id: result.id,
        extractedData: JSON.parse(result.extracted_data),
        confidence: result.confidence,
        processingTime: result.processing_time,
        createdAt: result.created_at
      }));
    } catch (error) {
      logger.error('Ошибка получения OCR результатов:', error);
      return [];
    }
  }

  // Получение статистики документов пользователя
  static async getUserStats(userId) {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN document_type = 'passport' THEN 1 END) as passports,
          COUNT(CASE WHEN document_type = 'contract' THEN 1 END) as contracts,
          COUNT(CASE WHEN document_type = 'invoice' THEN 1 END) as invoices,
          COUNT(CASE WHEN document_type = 'other' THEN 1 END) as other,
          SUM(file_size) as total_size,
          AVG(ocr_confidence) as avg_confidence
        FROM documents 
        WHERE user_id = ? AND is_deleted = 0
      `, [userId]);

      return stats;
    } catch (error) {
      logger.error('Ошибка получения статистики документов:', error);
      return null;
    }
  }

  // Поиск документов по тексту
  static async searchByText(userId, searchText, limit = 20) {
    try {
      const documents = await database.all(`
        SELECT * FROM documents 
        WHERE user_id = ? AND is_deleted = 0 
        AND (extracted_text LIKE ? OR original_name LIKE ?)
        ORDER BY created_at DESC
        LIMIT ?
      `, [userId, `%${searchText}%`, `%${searchText}%`, limit]);
      
      return documents.map(doc => new Document(doc));
    } catch (error) {
      logger.error('Ошибка поиска документов по тексту:', error);
      return [];
    }
  }

  // Получение анализа документа
  getAnalysis() {
    try {
      return this.analysisResult ? JSON.parse(this.analysisResult) : null;
    } catch (error) {
      logger.error('Ошибка парсинга анализа документа:', error);
      return null;
    }
  }

  // Проверка существования файла
  fileExists() {
    return this.filePath && fs.existsSync(this.filePath);
  }

  // Получение размера файла в читаемом формате
  getFileSizeFormatted() {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Получение расширения файла
  getFileExtension() {
    return path.extname(this.originalName).toLowerCase();
  }

  // Проверка, является ли документ изображением
  isImage() {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'];
    return imageTypes.includes(this.mimeType);
  }

  // Проверка, является ли документ PDF
  isPDF() {
    return this.mimeType === 'application/pdf';
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      filename: this.filename,
      originalName: this.originalName,
      filePath: this.filePath,
      fileSize: this.fileSize,
      fileSizeFormatted: this.getFileSizeFormatted(),
      mimeType: this.mimeType,
      documentType: this.documentType,
      extractedText: this.extractedText,
      ocrConfidence: this.ocrConfidence,
      analysisResult: this.getAnalysis(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isDeleted: this.isDeleted,
      fileExists: this.fileExists(),
      isImage: this.isImage(),
      isPDF: this.isPDF()
    };
  }
}

module.exports = Document;
