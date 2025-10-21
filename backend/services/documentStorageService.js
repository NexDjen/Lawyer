const database = require('../database/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class DocumentStorageService {
  /**
   * Ensure user exists in database, create if not
   * @param {string} userId - User ID
   */
  async ensureUserExists(userId) {
    try {
      const checkSql = 'SELECT id FROM users WHERE id = ?';
      const existingUser = await database.get(checkSql, [userId]);
      
      if (!existingUser) {
        const insertSql = `
          INSERT INTO users (id, name, email, password, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        const uniqueEmail = `${userId}-${Date.now()}@example.com`;
        await database.run(insertSql, [userId, `User ${userId}`, uniqueEmail, 'temp-password']);
        logger.info('Created user for document storage', { userId, email: uniqueEmail });
      }
    } catch (error) {
      logger.error('Error ensuring user exists:', error);
      throw error;
    }
  }

  /**
   * Save document to database
   * @param {string} userId - User ID
   * @param {Object} documentData - Document data including OCR and analysis
   * @returns {Promise<Object>} Saved document
   */
  async saveDocument(userId, documentData) {
    try {
      const documentId = uuidv4();
      const {
        filename,
        originalName,
        filePath,
        fileSize,
        mimeType,
        documentType,
        extractedText,
        ocrConfidence,
        analysisResult,
        imageBase64
      } = documentData;

      logger.info('Saving document to database', {
        documentId,
        filename,
        extractedTextLength: extractedText?.length || 0,
        extractedTextPreview: extractedText?.substring(0, 100) || 'empty',
        ocrConfidence,
        documentType,
        analysisResult: analysisResult ? 'has analysis' : 'no analysis'
      });

      // Prepare analysis result JSON with image
      const analysisResultJson = {
        ...analysisResult,
        image: imageBase64 || null
      };

      // First, ensure the user exists (create if not)
      await this.ensureUserExists(userId);

      const sql = `
        INSERT INTO documents (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, document_type, extracted_text, ocr_confidence, 
          analysis_result, created_at, updated_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)
      `;

      await database.run(sql, [
        documentId,
        userId,
        filename,
        originalName,
        filePath,
        fileSize,
        mimeType,
        documentType,
        extractedText,
        ocrConfidence,
        JSON.stringify(analysisResultJson)
      ]);

      logger.info('Document saved to database', { documentId, userId, filename });

      return {
        id: documentId,
        userId,
        filename,
        originalName,
        filePath,
        fileSize,
        mimeType,
        documentType,
        extractedText,
        ocrConfidence,
        analysisResult: analysisResultJson,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error saving document to database:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User documents
   */
  async getUserDocuments(userId) {
    try {
      const sql = `
        SELECT id, filename, original_name, file_path, file_size, mime_type, 
               document_type, extracted_text, ocr_confidence, analysis_result,
               created_at, updated_at
        FROM documents 
        WHERE user_id = ? AND is_deleted = 0
        ORDER BY created_at DESC
      `;

      const documents = await database.all(sql, [userId]);
      
      // Parse analysis_result JSON for each document и загружаем анализ из таблицы
      const result = await Promise.all(documents.map(async (doc) => {
        let analysis = null;
        
        // Пытаемся загрузить анализ из таблицы document_analysis
        try {
          const analysisSql = `
            SELECT risks, recommendations, summary, confidence, analysis_data
            FROM document_analysis 
            WHERE document_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
          `;
          const analysisRecord = await database.get(analysisSql, [doc.id]);
          
          if (analysisRecord) {
            // Парсим полные данные анализа
            let fullAnalysisData = null;
            try {
              fullAnalysisData = analysisRecord.analysis_data ? JSON.parse(analysisRecord.analysis_data) : null;
            } catch (err) {
              logger.warn('Failed to parse analysis_data:', err.message);
            }
            
            analysis = {
              risks: JSON.parse(analysisRecord.risks || '[]'),
              recommendations: JSON.parse(analysisRecord.recommendations || '[]'),
              summary: analysisRecord.summary,
              confidence: analysisRecord.confidence,
              riskLevel: fullAnalysisData?.summary?.riskLevel || 'medium',
              legalErrors: fullAnalysisData?.legalErrors || [],
              complianceIssues: fullAnalysisData?.complianceIssues || [],
              expertOpinion: fullAnalysisData?.expertOpinion || null,
              nextSteps: fullAnalysisData?.expertOpinion?.nextSteps || []
            };
            
            logger.info('🔍 DocumentStorageService - loaded analysis:', {
              docId: doc.id,
              risksCount: analysis.risks.length,
              recommendationsCount: analysis.recommendations.length,
              recommendations: analysis.recommendations,
              riskLevel: analysis.riskLevel
            });
          }
        } catch (err) {
          logger.warn('Failed to load analysis for document:', { docId: doc.id, error: err.message });
        }
        
        return {
          ...doc,
          analysis_result: doc.analysis_result ? JSON.parse(doc.analysis_result) : null,
          analysis: analysis // Новое поле с анализом
        };
      }));
      
      return result;
    } catch (error) {
      logger.error('Error getting user documents:', error);
      throw error;
    }
  }

  /**
   * Get single document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Object|null>} Document or null
   */
  async getDocumentById(documentId) {
    try {
      const sql = `
        SELECT id, user_id, filename, original_name, file_path, file_size, 
               mime_type, document_type, extracted_text, ocr_confidence, 
               analysis_result, created_at, updated_at
        FROM documents 
        WHERE id = ? AND is_deleted = 0
      `;

      const document = await database.get(sql, [documentId]);
      
      if (!document) {
        return null;
      }

      // Load detailed analysis from document_analysis table (FIXED!)
      let analysis = null;
      try {
        const analysisSql = `
          SELECT risks, recommendations, summary, confidence, analysis_data
          FROM document_analysis 
          WHERE document_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        const analysisRecord = await database.get(analysisSql, [documentId]);
        
        if (analysisRecord) {
          let fullAnalysisData = null;
          try {
            fullAnalysisData = analysisRecord.analysis_data ? JSON.parse(analysisRecord.analysis_data) : null;
          } catch (err) {
            logger.warn('Failed to parse analysis_data:', err.message);
          }
          
          analysis = {
            risks: JSON.parse(analysisRecord.risks || '[]'),
            recommendations: JSON.parse(analysisRecord.recommendations || '[]'),
            summary: analysisRecord.summary,
            confidence: analysisRecord.confidence,
            riskLevel: fullAnalysisData?.summary?.riskLevel || 'medium',
            legalErrors: fullAnalysisData?.legalErrors || [],
            complianceIssues: fullAnalysisData?.complianceIssues || [],
            expertOpinion: fullAnalysisData?.expertOpinion || null,
            nextSteps: fullAnalysisData?.expertOpinion?.nextSteps || []
          };
          
          logger.info('🔍 DocumentStorageService - loaded analysis:', {
            docId: documentId,
            risksCount: analysis.risks.length,
            recommendationsCount: analysis.recommendations.length,
            recommendations: analysis.recommendations,
            riskLevel: analysis.riskLevel
          });
        }
      } catch (err) {
        logger.warn('Failed to load analysis for document:', { docId: documentId, error: err.message });
      }

      return {
        ...document,
        analysis: analysis,  // Add detailed analysis
        analysisResult: document.analysis_result ? JSON.parse(document.analysis_result) : null
      };
    } catch (error) {
      logger.error('Error getting document by ID:', error);
      throw error;
    }
  }

  /**
   * Soft delete document
   * @param {string} documentId - Document ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteDocument(documentId) {
    try {
      const sql = `
        UPDATE documents 
        SET is_deleted = 1, updated_at = datetime('now')
        WHERE id = ?
      `;

      const result = await database.run(sql, [documentId]);
      
      if (result.changes > 0) {
        logger.info('Document soft deleted', { documentId });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Update document metadata
   * @param {string} documentId - Document ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateDocument(documentId, updates) {
    try {
      const allowedFields = ['filename', 'document_type', 'extracted_text', 'analysis_result'];
      const updateFields = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(key === 'analysis_result' ? JSON.stringify(value) : value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = datetime(\'now\')');
      values.push(documentId);

      const sql = `
        UPDATE documents 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND is_deleted = 0
      `;

      const result = await database.run(sql, values);
      
      if (result.changes > 0) {
        logger.info('Document updated', { documentId, updatedFields: Object.keys(updates) });
        return await this.getDocumentById(documentId);
      }
      
      return null;
    } catch (error) {
      logger.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Migrate localStorage documents to database
   * @param {string} userId - User ID
   * @param {Array} localStorageDocuments - Documents from localStorage
   * @returns {Promise<Object>} Migration result
   */
  async migrateLocalStorageDocuments(userId, localStorageDocuments) {
    try {
      const results = {
        total: localStorageDocuments.length,
        migrated: 0,
        errors: 0,
        errorDetails: []
      };

      for (const doc of localStorageDocuments) {
        try {
          // Parse document content if it's a string
          let documentData;
          if (typeof doc.content === 'string') {
            try {
              documentData = JSON.parse(doc.content);
            } catch {
              // If parsing fails, treat as plain text
              documentData = { extractedText: doc.content };
            }
          } else {
            documentData = doc.content;
          }

          // Prepare document data for database
          const dbDocumentData = {
            filename: doc.name || 'Migrated Document',
            originalName: doc.name || 'Migrated Document',
            filePath: '', // No file path for migrated documents
            fileSize: 0,
            mimeType: 'text/plain',
            documentType: doc.type || 'unknown',
            extractedText: documentData.extractedText || documentData.recognizedText || '',
            ocrConfidence: documentData.confidence || 0,
            analysisResult: doc.analysis || documentData.analysis || null,
            imageBase64: documentData.image || null
          };

          await this.saveDocument(userId, dbDocumentData);
          results.migrated++;
        } catch (error) {
          results.errors++;
          results.errorDetails.push({
            documentName: doc.name,
            error: error.message
          });
          logger.error('Error migrating document:', { docName: doc.name, error: error.message });
        }
      }

      logger.info('LocalStorage migration completed', results);
      return results;
    } catch (error) {
      logger.error('Error during localStorage migration:', error);
      throw error;
    }
  }

  /**
   * Get document statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Document statistics
   */
  async getUserDocumentStats(userId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN document_type = 'legal' THEN 1 END) as legal_documents,
          COUNT(CASE WHEN document_type = 'pdf' THEN 1 END) as pdf_documents,
          COUNT(CASE WHEN analysis_result IS NOT NULL THEN 1 END) as analyzed_documents,
          AVG(ocr_confidence) as avg_confidence
        FROM documents 
        WHERE user_id = ? AND is_deleted = 0
      `;

      const stats = await database.get(sql, [userId]);
      return stats;
    } catch (error) {
      logger.error('Error getting document statistics:', error);
      throw error;
    }
  }
}

module.exports = new DocumentStorageService();
