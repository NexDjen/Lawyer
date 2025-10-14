const WindexAI = require('openai');
const config = require('../config/config');
const logger = require('../utils/logger');

const windexai = new WindexAI({ apiKey: config.windexai.apiKey });

/**
 * Расширенный анализ документа с глубоким изучением
 * Находит тонкие места, ошибки и проблемы
 */
async function performAdvancedDocumentAnalysis(documentText, documentType = 'legal', fileName = '') {
  try {
    if (!config.windexai.apiKey) {
      throw new Error('WindexAI API ключ не настроен');
    }

    logger.info('Начинаем расширенный анализ документа', {
      textLength: documentText.length,
      documentType,
      fileName
    });

    // Создаем детальный промпт для глубокого анализа
    const analysisPrompt = `Ты - опытный юрист-аналитик с 20-летним стажем. Проведи глубокий анализ данного документа и найди ВСЕ возможные проблемы, ошибки и тонкие места.

ТРЕБОВАНИЯ К АНАЛИЗУ:
1. Внимательно изучи ВЕСЬ документ
2. Найди юридические ошибки, неточности и противоречия
3. Выяви риски для каждой из сторон
4. Определи пробелы в правовом регулировании
5. Предложи конкретные решения для каждой проблемы
6. Оцени общее качество документа

ВОЗВРАТИ СТРОГО В JSON ФОРМАТЕ:
{
  "summary": {
    "documentType": "тип документа",
    "overallQuality": "excellent|good|average|poor",
    "riskLevel": "low|medium|high|critical",
    "mainIssues": ["основные проблемы в 2-3 словах"]
  },
  "legalErrors": [
    {
      "type": "тип ошибки",
      "description": "описание ошибки",
      "location": "где найдена",
      "severity": "low|medium|high|critical",
      "solution": "как исправить"
    }
  ],
  "risks": [
    {
      "category": "категория риска",
      "description": "описание риска",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "как минимизировать"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "категория рекомендации",
      "description": "описание рекомендации",
      "implementation": "как реализовать"
    }
  ],
  "complianceIssues": [
    {
      "regulation": "какое требование нарушено",
      "description": "описание нарушения",
      "consequence": "последствия",
      "fix": "как исправить"
    }
  ],
  "suggestedClauses": [
    {
      "purpose": "назначение пункта",
      "text": "предлагаемый текст",
      "reason": "зачем нужен"
    }
  ],
  "missingElements": [
    {
      "element": "что отсутствует",
      "importance": "high|medium|low",
      "suggestion": "что добавить"
    }
  ]
}

ДОКУМЕНТ ДЛЯ АНАЛИЗА:
${documentText}`;

    const completion = await windexai.chat.completions.create({
      model: config.windexai.model || 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Ты - эксперт-юрист с глубокими знаниями российского права. Проводи детальный анализ документов, находи все проблемы и предлагай конкретные решения. Отвечай строго в JSON формате.' 
        },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.1, // Низкая температура для более точного анализа
      max_tokens: 4000
    });

    let content = completion.choices[0]?.message?.content?.trim() || '';
    
    // Очищаем от markdown разметки
    if (content.startsWith('```')) {
      content = content.replace(/^```json\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/,'');
    }

    const analysis = JSON.parse(content);

    // Валидация и нормализация результата
    const normalizedAnalysis = {
      summary: {
        documentType: analysis.summary?.documentType || documentType,
        overallQuality: analysis.summary?.overallQuality || 'average',
        riskLevel: analysis.summary?.riskLevel || 'medium',
        mainIssues: Array.isArray(analysis.summary?.mainIssues) ? analysis.summary.mainIssues : []
      },
      legalErrors: Array.isArray(analysis.legalErrors) ? analysis.legalErrors.slice(0, 10) : [],
      risks: Array.isArray(analysis.risks) ? analysis.risks.slice(0, 10) : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations.slice(0, 10) : [],
      complianceIssues: Array.isArray(analysis.complianceIssues) ? analysis.complianceIssues.slice(0, 10) : [],
      suggestedClauses: Array.isArray(analysis.suggestedClauses) ? analysis.suggestedClauses.slice(0, 5) : [],
      missingElements: Array.isArray(analysis.missingElements) ? analysis.missingElements.slice(0, 5) : []
    };

    // Добавляем статистику
    normalizedAnalysis.statistics = {
      totalIssues: normalizedAnalysis.legalErrors.length + normalizedAnalysis.risks.length + normalizedAnalysis.complianceIssues.length,
      criticalIssues: normalizedAnalysis.legalErrors.filter(e => e.severity === 'critical').length,
      highPriorityRecommendations: normalizedAnalysis.recommendations.filter(r => r.priority === 'high').length,
      missingElementsCount: normalizedAnalysis.missingElements.length
    };

    logger.info('Расширенный анализ документа завершен', {
      fileName,
      totalIssues: normalizedAnalysis.statistics.totalIssues,
      criticalIssues: normalizedAnalysis.statistics.criticalIssues
    });

    return normalizedAnalysis;

  } catch (error) {
    logger.error('Ошибка при расширенном анализе документа', {
      error: error.message,
      fileName
    });

    // Fallback анализ
    return {
      summary: {
        documentType: documentType,
        overallQuality: 'unknown',
        riskLevel: 'medium',
        mainIssues: ['Требует ручной проверки']
      },
      legalErrors: [{
        type: 'Ошибка анализа',
        description: 'Не удалось провести автоматический анализ',
        location: 'Весь документ',
        severity: 'medium',
        solution: 'Обратитесь к юристу для ручной проверки'
      }],
      risks: [{
        category: 'Техническая ошибка',
        description: 'Автоматический анализ недоступен',
        probability: 'high',
        impact: 'medium',
        mitigation: 'Проведите ручную проверку документа'
      }],
      recommendations: [{
        priority: 'high',
        category: 'Проверка',
        description: 'Проведите ручную юридическую экспертизу',
        implementation: 'Обратитесь к квалифицированному юристу'
      }],
      complianceIssues: [],
      suggestedClauses: [],
      missingElements: [],
      statistics: {
        totalIssues: 1,
        criticalIssues: 0,
        highPriorityRecommendations: 1,
        missingElementsCount: 0
      },
      error: error.message
    };
  }
}

/**
 * Создание отчета по анализу документа
 */
function generateAnalysisReport(analysis, fileName) {
  const report = {
    fileName,
    generatedAt: new Date().toISOString(),
    summary: analysis.summary,
    statistics: analysis.statistics,
    sections: {
      criticalIssues: analysis.legalErrors.filter(e => e.severity === 'critical'),
      highRisks: analysis.risks.filter(r => r.probability === 'high' && r.impact === 'high'),
      urgentRecommendations: analysis.recommendations.filter(r => r.priority === 'high'),
      complianceViolations: analysis.complianceIssues
    }
  };

  return report;
}

module.exports = {
  performAdvancedDocumentAnalysis,
  generateAnalysisReport
};
