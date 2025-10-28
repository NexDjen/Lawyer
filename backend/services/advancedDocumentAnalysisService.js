const WindexAI = require('openai');
const config = require('../config/config');
const logger = require('../utils/logger');

const windexai = new WindexAI({ apiKey: config.windexai.apiKey });

/**
 * Unified prompt system for legal document analysis
 * Combines all analysis types in one efficient call
 */
const ANALYSIS_SYSTEM_PROMPT = `Ты — Галина, юрист высшей категории с 30-летним стажем. Твоя специализация — российское право.

Задача: Провести комплексный юридический анализ документа и дать рекомендации КЛИЕНТУ (пострадавшему/заявителю).

КРИТИЧЕСКИ ВАЖНО:
- Анализируй ТОЛЬКО факты, присутствующие в документе
- НЕ придумывай проблемы, которых нет
- Будь максимально точной и объективной
- Если что-то присутствует в документе - НЕ указывай это как отсутствующее
- ВСЕ рекомендации давай КЛИЕНТУ (пострадавшему/заявителю), а НЕ полиции/судье/прокурору
- Клиент - это тот, кто обратился за помощью и получил этот документ

Возвращай ТОЛЬКО валидный JSON без markdown обрамления.`;

const ANALYSIS_USER_PROMPT = (documentText, documentType, isBatch = false, documentCount = 1) => `Проанализируй ${isBatch ? `набор из ${documentCount} юридических документов` : 'юридический документ'} и верни структурированный анализ.

${isBatch ? 'ВАЖНО: Это набор связанных документов - анализируй их как единое дело для получения полной картины происшествия.' : `Тип документа: ${documentType}`}

КРИТИЧЕСКИ ВАЖНО:
- Анализируй ТОЛЬКО то, что реально присутствует в документе${isBatch ? 'ах' : ''}
- НЕ придумывай проблемы, которых нет
- Если в документе есть подписи - НЕ указывай их отсутствие как ошибку
- Если в документе есть печати - НЕ указывай их отсутствие как ошибку
- Если даты логичны - НЕ указывай их как проблему
- Будь максимально точным и объективным
- ВСЕ рекомендации давай КЛИЕНТУ (пострадавшему/заявителю), который получил этот документ
- НЕ давай советы полиции, судье или прокурору - только клиенту
${isBatch ? '- При анализе множественных документов учитывай взаимосвязи между ними\n- Выявляй противоречия между документами\n- Определяй общую картину происшествия' : ''}

Требования к анализу:
1. Риски: Найди РЕАЛЬНЫЕ правовые и процессуальные риски для КЛИЕНТА с оценкой вероятности и воздействия
2. Ошибки: Выяви ТОЛЬКО ФАКТИЧЕСКИЕ юридические ошибки и нарушения законодательства
3. Рекомендации: Предложи конкретные действия ДЛЯ КЛИЕНТА по устранению РЕАЛЬНЫХ проблем
4. Экспертная оценка: Дай объективную общую оценку документа${isBatch ? 'ов и их взаимосвязей' : ''} с точки зрения клиента

Формат ответа:
{
  "risks": [
    {
      "category": "категория риска",
      "description": "описание риска для клиента",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "способ устранения риска клиентом"
    }
  ],
  "legalErrors": [
    {
      "type": "тип ошибки",
      "description": "описание ошибки",
      "location": "место в документе",
      "severity": "low|medium|high|critical",
      "solution": "что может сделать клиент",
      "legalBasis": "статья закона"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "категория",
      "title": "название",
      "description": "что должен сделать КЛИЕНТ",
      "implementation": "план действий для КЛИЕНТА",
      "owner": "Клиент",
      "deadline": "срок",
      "requiresDocument": true|false (true если клиенту нужно подготовить жалобу, заявление, иск и т.д.)
    }
  ],
  "expertOpinion": {
    "overallAssessment": "общая оценка ситуации клиента",
    "criticalPoints": ["ключевые моменты для клиента"],
    "successProbability": "high|medium|low",
    "nextSteps": ["следующие шаги для клиента"]
  }
}

Документ для анализа:
${documentText}`;

/**
 * Performs comprehensive legal document analysis in a single API call
 * @param {string} documentText - The document text to analyze
 * @param {string} documentType - Type of document (default: 'legal')
 * @param {string} fileName - Name of the file being analyzed
 * @returns {Promise<Object>} Complete analysis with risks, errors, recommendations, and expert opinion
 */
async function performAdvancedDocumentAnalysis(documentText, documentType = 'legal', fileName = '') {
  const startTime = Date.now();
  
  try {
    if (!config.windexai.apiKey) {
      throw new Error('WindexAI API key not configured');
    }

    // Validate input
    if (!documentText || documentText.trim().length === 0) {
      throw new Error('Document text is empty');
    }

    logger.info('Starting comprehensive document analysis', {
      textLength: documentText.length,
      documentType,
      fileName
    });

    // Single unified API call for complete analysis
    const completion = await windexai.chat.completions.create({
      model: config.windexai.model || 'gpt-4o',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: ANALYSIS_USER_PROMPT(documentText, documentType) }
      ],
      temperature: 0.1, // Очень низкая температура для максимальной точности
      max_tokens: 4000,
      response_format: { type: 'json_object' } // Ensures JSON response
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const analysis = parseAnalysisResponse(content);

    // Build comprehensive result structure
    const result = buildAnalysisResult(analysis, documentType, fileName);
    
    const duration = Date.now() - startTime;
    logger.info('Document analysis completed', {
      fileName,
      duration: `${duration}ms`,
      risksCount: result.risks.length,
      errorsCount: result.legalErrors.length,
      recommendationsCount: result.recommendations.length
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Document analysis failed', {
      error: error.message,
      fileName,
      duration: `${duration}ms`
    });

    return buildFallbackAnalysis(documentType, error);
  }
}

/**
 * Perform batch analysis of multiple documents as a unified case
 * @param {Array} documents - Array of document objects with text, type, and fileName
 * @returns {Promise<Object>} Unified analysis of all documents
 */
async function performBatchDocumentAnalysis(documents) {
  const startTime = Date.now();
  
  try {
    if (!config.windexai.apiKey) {
      throw new Error('WindexAI API key not configured');
    }

    // Validate input
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      throw new Error('No documents provided for batch analysis');
    }

    // Combine all document texts with clear separators
    const combinedText = documents.map((doc, index) => {
      return `=== ДОКУМЕНТ ${index + 1}: ${doc.fileName || `Документ_${index + 1}`} ===\n${doc.documentText || ''}\n`;
    }).join('\n');

    logger.info('Starting batch document analysis', {
      documentCount: documents.length,
      totalTextLength: combinedText.length,
      documentNames: documents.map(d => d.fileName || 'unnamed')
    });

    // Single unified API call for batch analysis
    const completion = await windexai.chat.completions.create({
      model: config.windexai.model || 'gpt-4o',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: ANALYSIS_USER_PROMPT(combinedText, 'legal', true, documents.length) }
      ],
      temperature: 0.1,
      max_tokens: 6000, // Increased for batch analysis
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const analysis = parseAnalysisResponse(content);

    // Build comprehensive result structure for batch analysis
    const result = buildBatchAnalysisResult(analysis, documents);
    
    const duration = Date.now() - startTime;
    logger.info('Batch document analysis completed', {
      documentCount: documents.length,
      duration: `${duration}ms`,
      risksCount: result.risks.length,
      errorsCount: result.legalErrors.length,
      recommendationsCount: result.recommendations.length
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Batch document analysis failed', {
      error: error.message,
      documentCount: documents.length,
      duration: `${duration}ms`
    });

    return buildFallbackBatchAnalysis(documents, error);
  }
}
function parseAnalysisResponse(content) {
  try {
    // Remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent
        .replace(/^```json?\n?/i, '')
        .replace(/\n?```$/,'');
    }

    // Extract JSON object
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanContent);
    
    // Validate structure
    return {
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      legalErrors: Array.isArray(parsed.legalErrors) ? parsed.legalErrors : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      expertOpinion: parsed.expertOpinion || {}
    };
  } catch (error) {
    logger.error('Failed to parse analysis response', { error: error.message });
    return {
      risks: [],
      legalErrors: [],
      recommendations: [],
      expertOpinion: {}
    };
  }
}

/**
 * Build structured analysis result
 */
function buildAnalysisResult(analysis, documentType, fileName) {
  const { risks, legalErrors, recommendations, expertOpinion } = analysis;

  // Calculate risk level
  const hasHighRisks = risks.some(r => 
    r.probability === 'high' && r.impact === 'high'
  );
  const hasMediumRisks = risks.some(r => 
    (r.probability === 'high' || r.impact === 'high')
  );

  const riskLevel = hasHighRisks ? 'high' : (hasMediumRisks ? 'medium' : 'low');

  return {
    summary: {
      documentType,
      overallQuality: 'analyzed',
      riskLevel,
      mainIssues: legalErrors.slice(0, 3).map(e => e.type)
    },
    legalErrors,
    risks,
    recommendations,
    expertOpinion: {
      overallAssessment: expertOpinion.overallAssessment || 'Документ проанализирован',
      criticalPoints: expertOpinion.criticalPoints || [],
      successProbability: expertOpinion.successProbability || 'medium',
      nextSteps: expertOpinion.nextSteps || []
    },
    statistics: {
      totalIssues: legalErrors.length + risks.length,
      criticalIssues: legalErrors.filter(e => e.severity === 'critical').length,
      highPriorityRecommendations: recommendations.filter(r => r.priority === 'high').length
    }
  };
}

/**
 * Build structured analysis result for batch analysis
 */
function buildBatchAnalysisResult(analysis, documents) {
  const { risks, legalErrors, recommendations, expertOpinion } = analysis;

  // Calculate risk level for batch
  const hasHighRisks = risks.some(r => 
    r.probability === 'high' && r.impact === 'high'
  );
  const hasMediumRisks = risks.some(r => 
    (r.probability === 'high' || r.impact === 'high')
  );

  const riskLevel = hasHighRisks ? 'high' : (hasMediumRisks ? 'medium' : 'low');

  return {
    summary: {
      documentType: 'batch',
      documentCount: documents.length,
      overallQuality: 'analyzed',
      riskLevel,
      mainIssues: legalErrors.slice(0, 3).map(e => e.type)
    },
    legalErrors,
    risks,
    recommendations,
    expertOpinion: {
      overallAssessment: expertOpinion.overallAssessment || 'Набор документов проанализирован',
      criticalPoints: expertOpinion.criticalPoints || [],
      successProbability: expertOpinion.successProbability || 'medium',
      nextSteps: expertOpinion.nextSteps || []
    },
    statistics: {
      totalIssues: legalErrors.length + risks.length,
      criticalIssues: legalErrors.filter(e => e.severity === 'critical').length,
      highPriorityRecommendations: recommendations.filter(r => r.priority === 'high').length,
      documentCount: documents.length
    },
    documents: documents.map(doc => ({
      fileName: doc.fileName,
      documentType: doc.documentType || 'legal'
    }))
  };
}

/**
 * Build fallback analysis for batch when main analysis fails
 */
function buildFallbackBatchAnalysis(documents, error) {
  return {
    summary: {
      documentType: 'batch',
      documentCount: documents.length,
      overallQuality: 'error',
      riskLevel: 'unknown',
      mainIssues: ['Ошибка анализа']
    },
    legalErrors: [{
      type: 'Ошибка анализа',
      description: `Не удалось проанализировать набор документов: ${error.message}`,
      severity: 'critical',
      location: 'Система анализа',
      solution: 'Попробуйте проанализировать документы по отдельности'
    }],
    risks: [],
    recommendations: [{
      title: 'Повторить анализ',
      description: 'Попробуйте проанализировать документы по отдельности',
      priority: 'high',
      category: 'Техническое'
    }],
    expertOpinion: {
      overallAssessment: 'Ошибка при анализе набора документов',
      criticalPoints: ['Техническая ошибка'],
      successProbability: 'low',
      nextSteps: ['Повторить анализ по отдельности']
    },
    statistics: {
      totalIssues: 1,
      criticalIssues: 1,
      highPriorityRecommendations: 1,
      documentCount: documents.length
    },
    documents: documents.map(doc => ({
      fileName: doc.fileName,
      documentType: doc.documentType || 'legal'
    }))
  };
}

/**
 * Build fallback analysis when main analysis fails
 */
function buildFallbackAnalysis(documentType, error) {
  return {
    summary: {
      documentType,
      overallQuality: 'error',
      riskLevel: 'medium',
      mainIssues: ['Требуется ручная проверка']
    },
    legalErrors: [{
      type: 'Ошибка автоматического анализа',
      description: 'Не удалось провести полный автоматический анализ. Рекомендуется консультация с юристом.',
      location: 'Весь документ',
      severity: 'medium',
      solution: 'Обратитесь к квалифицированному юристу для проверки',
      legalBasis: 'Ст. 48 Конституции РФ - право на юридическую помощь'
    }],
    risks: [{
      category: 'Технический риск',
      description: 'Автоматический анализ недоступен, возможны неучтенные правовые риски.',
      probability: 'medium',
      impact: 'medium',
      mitigation: 'Проведите профессиональную юридическую экспертизу'
    }],
    recommendations: [{
      priority: 'high',
      category: 'Консультация',
      title: 'Получить профессиональную юридическую консультацию',
      description: 'Документ требует проверки квалифицированным юристом',
      implementation: 'Обратитесь к юристу в течение 3-5 рабочих дней',
      deadline: '3-5 рабочих дней'
    }],
    expertOpinion: {
      overallAssessment: 'Документ требует профессиональной экспертизы',
      criticalPoints: ['Автоматический анализ недоступен'],
      successProbability: 'unknown',
      nextSteps: ['Консультация с юристом', 'Ручная проверка документа']
    },
    statistics: {
      totalIssues: 1,
      criticalIssues: 0,
      highPriorityRecommendations: 1
    },
    error: error.message
  };
}

/**
 * Generate analysis report from completed analysis
 */
function generateAnalysisReport(analysis, fileName) {
  return {
    fileName,
    generatedAt: new Date().toISOString(),
    summary: analysis.summary,
    statistics: analysis.statistics,
    sections: {
      criticalIssues: analysis.legalErrors.filter(e => e.severity === 'critical'),
      highRisks: analysis.risks.filter(r => 
        r.probability === 'high' && r.impact === 'high'
      ),
      urgentRecommendations: analysis.recommendations.filter(r => r.priority === 'high')
    }
  };
}

module.exports = {
  performAdvancedDocumentAnalysis,
  performBatchDocumentAnalysis,
  generateAnalysisReport
};
