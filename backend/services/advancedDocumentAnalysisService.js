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
    const analysisPrompt = `Ты — Галина Петровна, опытный юридический аналитик с 25-летним стажем, защищающий интересы клиента. Работаешь строго в заданной юрисдикции и процедуре.
Твоя задача — выявить нарушения и процессуальные уязвимости в документе и выдать МАКСИМАЛЬНО ДЕТАЛЬНЫЕ практичные действия защиты.

КРИТИЧЕСКИ ВАЖНО ДЛЯ РЕКОМЕНДАЦИЙ:
• Каждая рекомендация должна содержать ПОДРОБНОЕ пошаговое описание действий (минимум 3-5 конкретных шагов)
• Укажи точные сроки выполнения каждого шага
• Определи ответственного лица/орган для каждого действия
• Опиши возможные препятствия и как их преодолеть
• Укази необходимые документы и доказательства
• Дай рекомендации по оформлению документов
• Укажи сроки давности/реализации для каждой рекомендации

Контекст (заполняется вызывающей стороной):
jurisdiction: {например: "РФ"}
procedure: {КоАП|УПК|ГПК|КАС|иное}
stage: {pretrial|trial|appeal|cassation}
lawVersionDate: {YYYY-MM-DD}
doc:
  type: {protocol|postanovlenie|definition|decision|order|иное}
  date: {YYYY-MM-DD}
  number: {номер документа}
  issuer: {орган/суд}
  signatory: {должность, ФИО}
  serviceDate: {YYYY-MM-DD}
  deliveryMethod: {inPerson|mail|EDS|unknown}

Обязательные правила:
• Pin-cite: для каждого нарушения указывать дословный фрагмент ≤300 символов и location {page, para, lineRange}.
• Нормы права: объект {code, article, part, point}, указывать lawVersionDate. Если неизвестно — lawRefs: [] и confidence<0.5 с needsVerification.
• Сроки: дедлайны от serviceDate в ISO YYYY-MM-DD, указывать ruleRef.
• Классификация нарушений: competence|form|evidence|procedure|deadline|rights.
• severity: low|medium|high|critical по влиянию на допустимость доказательств и процедурные ошибки.
• Anti-hallucination: не выдумывать факты, отражать missing и assumptions.
• Минимум 3–5 пунктов в risks и recommendations.
• Тон: нейтральный юридический стиль, термины: «процессуальный механизм», «основание», «ходатайство», «исключение доказательства».
• Для больших текстов (>10 000 знаков): агрегировать по разделам, но вернуть единый JSON.

Структура КАЖДОЙ рекомендации:
{
  "priority": "high|medium|low",
  "category": "категория рекомендации",
  "title": "короткое название",
  "description": "общее описание проблемы и решения",
  "steps": [
    {
      "step": 1,
      "title": "Название шага",
      "description": "Подробное описание что нужно сделать",
      "timeframe": "сроки выполнения",
      "responsible": "кто отвечает (клиент, юрист, суд)",
      "documents": ["список необходимых документов"],
      "notes": "дополнительные замечания"
    }
  ],
  "timeline": "общий срок выполнения всей рекомендации",
  "owner": "кто отвечает за реализацию",
  "dependencies": ["другие рекомендации, которые должны быть выполнены первыми"],
  "risks": "возможные риски при невыполнении",
  "successIndicators": "как определить успешное выполнение",
  "implementation": "практические советы по реализации",
  "deadline": "абсолютный срок выполнения"
}

Строго возвращай JSON согласно схеме:
{
  "summary": { ... },
  "legalErrors": [ ... ],
  "risks": [ ... ],
  "recommendations": [ ... ],
  "motions": [ ... ],
  "assumptions": [...],
  "missing": [...],
  "expertOpinion": { ... },
  "controls": { "nonFabrication": true, "returnEmptyIfUnknown": true }
}

ДОКУМЕНТ ДЛЯ АНАЛИЗА:
${documentText}`;

    const completion = await windexai.chat.completions.create({
      model: config.windexai.model || 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Ты - Галина Петровна, опытный юрист-аналитик с 25-летним стажем. Ты дотошна, профессиональна и находишь даже скрытые правовые проблемы. Твой анализ должен быть МАКСИМАЛЬНО ДЕТАЛЬНЫМ, конкретным, практичным и основанным на реальном опыте. Не упускай ни одной проблемы. Находи минимум 3-5 рисков и 3-5 рекомендаций для каждого документа. КРИТИЧЕСКИ ВАЖНО: каждая рекомендация должна содержать подробное пошаговое описание с точными сроками, ответственными лицами, необходимыми документами и практическими советами. Отвечай строго в JSON формате, будь максимально детальной и полезной.' 
        },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.2, // Низкая температура для точного, но детального анализа
      max_tokens: 8000 // Увеличенный лимит для ОЧЕНЬ детального анализа рекомендаций
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
      missingElements: Array.isArray(analysis.missingElements) ? analysis.missingElements.slice(0, 5) : [],
      expertOpinion: analysis.expertOpinion || {
        overallAssessment: 'Требует дополнительной экспертизы',
        criticalPoints: [],
        successProbability: 'unknown',
        nextSteps: ['Обратиться к юристу']
      }
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

    // Fallback анализ от Галины Петровны
    return {
      summary: {
        documentType: documentType,
        overallQuality: 'unknown',
        riskLevel: 'medium',
        mainIssues: ['Требует ручной проверки']
      },
      legalErrors: [{
        type: 'Ошибка анализа',
        description: 'Не удалось провести автоматический анализ документа. Требуется ручная экспертиза.',
        location: 'Весь документ',
        severity: 'medium',
        solution: 'Обратитесь к квалифицированному юристу для детальной проверки',
        legalBasis: 'Ст. 15 ГПК РФ - принцип объективной истины'
      }],
      risks: [{
        category: 'Техническая ошибка',
        description: 'Автоматический анализ недоступен. Документ может содержать скрытые правовые риски.',
        probability: 'high',
        impact: 'medium',
        mitigation: 'Проведите ручную проверку документа у опытного юриста',
        legalConsequences: 'Возможны процессуальные нарушения при неправильной оценке'
      }],
      recommendations: [{
        priority: 'high',
        category: 'Экспертиза',
        description: 'Проведите ручную юридическую экспертизу документа',
        implementation: '1. Обратитесь к юристу с опытом в данной области права\n2. Предоставьте полный пакет документов\n3. Получите письменное заключение',
        deadline: 'В течение 3-5 рабочих дней'
      }],
      complianceIssues: [],
      suggestedClauses: [],
      missingElements: [],
      expertOpinion: {
        overallAssessment: 'Документ требует профессиональной экспертизы. Автоматический анализ недоступен.',
        criticalPoints: ['Необходима ручная проверка', 'Возможны скрытые правовые риски'],
        successProbability: 'unknown',
        nextSteps: ['Обратиться к юристу', 'Получить письменное заключение', 'Проанализировать все риски']
      },
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
