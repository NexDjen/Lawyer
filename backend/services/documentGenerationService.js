const WindexAI = require('openai');
const config = require('../config/config');
const logger = require('../utils/logger');

const windexai = new WindexAI({ apiKey: config.windexai.apiKey });

/**
 * Генерирует юридический документ на основе рекомендаций
 * @param {object} params - Параметры генерации
 * @param {string} params.documentType - Тип документа (жалоба, заявление, иск и т.д.)
 * @param {object} params.recommendation - Рекомендация из анализа
 * @param {string} params.originalDocumentText - Текст оригинального документа
 * @param {object} params.analysis - Полный анализ документа
 * @param {object} params.userInfo - Информация о пользователе (имя, адрес и т.д.)
 * @returns {Promise<{generatedDocument: string, fileName: string}>}
 */
async function generateLegalDocument(params) {
  try {
    const {
      documentType = 'заявление',
      recommendation,
      originalDocumentText,
      analysis,
      userInfo = {}
    } = params;

    if (!config.windexai.apiKey) {
      throw new Error('WindexAI API ключ не настроен');
    }

    logger.info('Начинаем генерацию юридического документа', {
      documentType,
      recommendationTitle: recommendation?.title
    });

    const systemPrompt = `Ты — Галина, юрист высшей категории с 30-летним стажем. Твоя специализация — составление юридических документов по российскому праву.

Задача: Составить профессиональный юридический документ (${documentType}).

КРИТИЧЕСКИ ВАЖНО:
- Документ должен быть составлен в строгом соответствии с российским законодательством
- Используй формальный юридический стиль
- Укажи все необходимые реквизиты
- Ссылайся на конкретные статьи законов
- Документ должен быть готов к использованию без доработок

Возвращай ТОЛЬКО текст документа без дополнительных комментариев.`;

    const userPrompt = `Составь ${documentType} на основе следующей информации:

РЕКОМЕНДАЦИЯ:
Название: ${recommendation?.title || 'Не указано'}
Описание: ${recommendation?.description || 'Не указано'}
План реализации: ${recommendation?.implementation || 'Не указано'}
Срок: ${recommendation?.deadline || 'Не указано'}

АНАЛИЗ ОРИГИНАЛЬНОГО ДОКУМЕНТА:
${analysis?.expertOpinion?.overallAssessment || 'Анализ недоступен'}

ВЫЯВЛЕННЫЕ РИСКИ:
${analysis?.risks?.map((r, i) => `${i + 1}. ${r.category}: ${r.description}`).join('\n') || 'Риски не выявлены'}

ЮРИДИЧЕСКИЕ ОШИБКИ:
${analysis?.legalErrors?.map((e, i) => `${i + 1}. ${e.type}: ${e.description} (${e.legalBasis})`).join('\n') || 'Ошибки не выявлены'}

ОРИГИНАЛЬНЫЙ ДОКУМЕНТ (для ссылок):
${originalDocumentText?.substring(0, 2000) || 'Текст недоступен'}

ИНФОРМАЦИЯ О ЗАЯВИТЕЛЕ:
Имя: ${userInfo.name || '[ФИО заявителя]'}
Адрес: ${userInfo.address || '[Адрес заявителя]'}
Телефон: ${userInfo.phone || '[Телефон заявителя]'}
Email: ${userInfo.email || '[Email заявителя]'}

ТРЕБОВАНИЯ К ДОКУМЕНТУ:
1. Укажи адресата (орган, должность, ФИО)
2. Укажи данные заявителя
3. Опиши ситуацию кратко и по существу
4. Сошлись на конкретные нарушения законодательства
5. Укажи требования со ссылками на законы
6. Укажи приложения (если необходимо)
7. Укажи дату и место для подписи

ФОРМАТ ДОКУМЕНТА:
- Используй правильное оформление шапки документа
- Используй нумерацию для пунктов
- Используй корректные юридические термины
- Сохраняй официально-деловой стиль

Составь документ ПОЛНОСТЬЮ, готовый к печати и подаче.`;

    const completion = await windexai.chat.completions.create({
      model: config.windexai.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Низкая температура для точности
      max_tokens: 15000 // 15000 токенов как запрошено
    });

    const generatedDocument = completion.choices[0]?.message?.content?.trim() || '';

    if (!generatedDocument) {
      throw new Error('Не удалось сгенерировать документ');
    }

    // Генерируем имя файла
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${documentType}_${dateStr}.txt`;

    logger.info('Документ успешно сгенерирован', {
      documentType,
      length: generatedDocument.length,
      fileName
    });

    return {
      generatedDocument,
      fileName,
      documentType,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Ошибка при генерации юридического документа', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Определяет тип документа из рекомендации
 * @param {object} recommendation - Рекомендация
 * @returns {string|null} - Тип документа или null
 */
function detectDocumentType(recommendation) {
  if (!recommendation || !recommendation.title) return null;

  const title = recommendation.title.toLowerCase();
  const description = (recommendation.description || '').toLowerCase();
  const implementation = (recommendation.implementation || '').toLowerCase();

  const text = `${title} ${description} ${implementation}`;

  // Определяем тип документа по ключевым словам
  if (text.includes('жалоб')) return 'жалоба';
  if (text.includes('заявлени')) return 'заявление';
  if (text.includes('исков') || text.includes('иск в суд')) return 'исковое заявление';
  if (text.includes('ходатайств')) return 'ходатайство';
  if (text.includes('обращени')) return 'обращение';
  if (text.includes('претензи')) return 'претензия';
  if (text.includes('апелляци')) return 'апелляционная жалоба';
  if (text.includes('кассаци')) return 'кассационная жалоба';
  if (text.includes('возражени')) return 'возражение';
  if (text.includes('отзыв')) return 'отзыв';

  return null;
}

/**
 * Проверяет, требуется ли генерация документа для рекомендации
 * @param {object} recommendation - Рекомендация
 * @returns {boolean}
 */
function shouldGenerateDocument(recommendation) {
  const documentType = detectDocumentType(recommendation);
  return documentType !== null;
}

module.exports = {
  generateLegalDocument,
  detectDocumentType,
  shouldGenerateDocument
};



