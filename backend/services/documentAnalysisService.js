const WindexAI = require('openai'); // WindexAI API uses OpenAI SDK
const config = require('../config/config');
const logger = require('../utils/logger');

const windexai = new WindexAI({ apiKey: config.windexai.apiKey });

function normalizeCompliance(value) {
  const v = String(value || '').toLowerCase();
  if (v.includes('high') || v.includes('выс')) return 'high';
  if (v.includes('med') || v.includes('сред')) return 'medium';
  if (v.includes('low') || v.includes('низ')) return 'low';
  return 'medium';
}

async function analyzeDocumentText(text) {
  try {
    if (!config.windexai.apiKey) {
      throw new Error('WindexAI API ключ не настроен');
    }

    const prompt = `Проанализируй данный юридический документ и верни JSON без пояснений и без markdown.
Требуется:
- risks: массив из максимум 5 кратких рисков по сути документа (по-русски, без нумерации),
- recommendations: массив из максимум 5 кратких практических рекомендаций (по-русски, без нумерации),
- compliance: одно из значений [high, medium, low] по общей оценке соблюдения требований.

Возврати строго такой JSON:
{
  "risks": ["..."],
  "recommendations": ["..."],
  "compliance": "high|medium|low"
}

ТЕКСТ:
${text}`;

    const completion = await windexai.chat.completions.create({
      model: config.windexai.model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'Ты юридический аналитик. Отвечай строго в JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500
    });

    let content = completion.choices[0]?.message?.content?.trim() || '';
    if (content.startsWith('```')) {
      content = content.replace(/^```json\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/,'');
    }
    const parsed = JSON.parse(content);

    const risks = Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : [];
    const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : [];
    const compliance = normalizeCompliance(parsed.compliance);

    return {
      risks,
      recommendations,
      compliance,
      risksCount: risks.length,
      recommendationsCount: recommendations.length
    };
  } catch (error) {
    logger.error('Document analysis failed', { error: error.message });
    // Fallback: минимальный анализ
    const fallbackRisks = [];
    const fallbackRecs = [];
    if ((text || '').length < 50) {
      fallbackRisks.push('Недостаточный объем данных для анализа');
      fallbackRecs.push('Предоставьте более полный текст документа');
    } else {
      fallbackRisks.push('Требует проверки юридических формулировок');
      fallbackRecs.push('Уточните ключевые условия и ответственность сторон');
    }
    return {
      risks: fallbackRisks,
      recommendations: fallbackRecs,
      compliance: 'medium',
      risksCount: fallbackRisks.length,
      recommendationsCount: fallbackRecs.length
    };
  }
}

module.exports = { analyzeDocumentText };

