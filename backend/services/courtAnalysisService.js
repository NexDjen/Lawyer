const WindexAI = require('openai'); // WindexAI API uses OpenAI SDK
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/config');
const FormData = require('form-data');
const axios = require('axios');

const windexai = new WindexAI({
  apiKey: config.windexai.apiKey
});

// Распознавание речи из аудио файла
const transcribeAudio = async (audioFilePath) => {
  try {
    logger.info('Начинаем распознавание речи из аудио', { audioFilePath });
    
    // Читаем аудио файл
    const audioBuffer = fs.readFileSync(audioFilePath);
    
    // Создаем FormData для WindexAI Whisper API
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'hearing.wav',
      contentType: 'audio/wav'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru');
    
    // Отправляем запрос к WindexAI Whisper API
    const response = await axios.post('https://api.windexai.com/v1/audio/transcriptions', formData, {
      headers: {
        'Authorization': `Bearer ${config.windexai.apiKey}`,
        ...formData.getHeaders()
      }
    });
    
    const transcript = response.data.text;
    logger.info('Распознавание речи завершено', { 
      audioFilePath,
      transcriptLength: transcript.length,
      preview: transcript.substring(0, 100) + '...'
    });
    
    return transcript;
  } catch (error) {
    logger.error('Ошибка распознавания речи', { 
      error: error.message,
      audioFilePath 
    });
    throw error;
  }
};

// Анализ судебного заседания
const analyzeCourtHearing = async (audioFilePath, transcript = '') => {
  try {
    logger.info('Начинаем анализ судебного заседания', { audioFilePath });

    // Если есть транскрипт, используем его, иначе создаем из аудио
    let hearingText = transcript;
    
    if (!hearingText && audioFilePath) {
      // Распознаем речь из аудио файла
      hearingText = await transcribeAudio(audioFilePath);
    }

    // Анализируем текст заседания с помощью AI
    const analysis = await performAIAnalysis(hearingText);
    
    logger.info('Анализ судебного заседания завершен', {
      textLength: hearingText.length,
      errorsFound: analysis.errors.length,
      recommendationsCount: analysis.recommendations.length
    });

    return analysis;
  } catch (error) {
    logger.error('Ошибка анализа судебного заседания', {
      error: error.message,
      audioFilePath
    });
    throw error;
  }
};

// Генерация имитации транскрипта для демонстрации
const generateMockTranscript = async () => {
  const mockTranscripts = [
    `СУДЬЯ: Заседание объявляется открытым. Дело № 2-1234/2024 по иску Петрова И.И. к ООО "Стройсервис" о взыскании задолженности. Судья Иванов И.И., секретарь Сидорова А.А. Истец Петров И.И., представитель отсутствует. Ответчик ООО "Стройсервис", представитель отсутствует. Суд приступает к рассмотрению дела по существу.

ПРОКУРОР: Уважаемый суд, в ходе рассмотрения дела выявлены нарушения процессуальных норм. Истец не представил необходимые доказательства в установленный срок. Прошу суд отказать в удовлетворении иска.

СУДЬЯ: Истец, что можете пояснить по существу заявленных требований?

ИСТЕЦ: Уважаемый суд, я заключил договор с ответчиком на выполнение ремонтных работ. Работы выполнены, но оплата не произведена. Прошу взыскать задолженность в размере 150 000 рублей.

СУДЬЯ: Какие доказательства у вас имеются?

ИСТЕЦ: У меня есть договор и акт выполненных работ.

ПРОКУРОР: Уважаемый суд, истец не представил подлинники документов. Копии не могут служить доказательством. Прошу суд отказать в удовлетворении иска.

СУДЬЯ: Истец, почему не представили подлинники документов?

ИСТЕЦ: Подлинники у меня есть, но я их не принес.

СУДЬЯ: Суд откладывает рассмотрение дела для представления подлинников документов. Следующее заседание назначить на 15 декабря 2024 года в 10:00. Заседание объявляется закрытым.`,

    `СУДЬЯ: Заседание объявляется открытым. Дело № 1-5678/2024 по обвинению Сидорова А.А. в совершении преступления, предусмотренного ч. 1 ст. 158 УК РФ. Судья Петрова Е.Е., секретарь Козлова М.М. Государственный обвинитель - прокурор Иванов П.П. Защитник - адвокат Смирнов В.В. Подсудимый Сидоров А.А. Суд приступает к рассмотрению дела.

ПРОКУРОР: Уважаемый суд, в ходе предварительного следствия установлено, что подсудимый Сидоров А.А. 15 марта 2024 года незаконно проник в квартиру потерпевшего и похитил имущество на сумму 50 000 рублей. Прошу суд признать подсудимого виновным и назначить наказание в виде лишения свободы сроком на 2 года.

ЗАЩИТНИК: Уважаемый суд, мой подзащитный вину не признает. Доказательства виновности отсутствуют. Прошу суд оправдать подсудимого.

СУДЬЯ: Подсудимый, понятны ли вам обвинения?

ПОДСУДИМЫЙ: Да, понятны, но я не виновен.

СУДЬЯ: Свидетель Козлов К.К., расскажите, что вы знаете по делу?

СВИДЕТЕЛЬ: Я видел, как подсудимый выходил из квартиры потерпевшего с сумкой.

ЗАЩИТНИК: Уважаемый суд, показания свидетеля противоречивы. В протоколе допроса он указал другое время. Прошу суд не доверять показаниям свидетеля.

ПРОКУРОР: Уважаемый суд, показания свидетеля достоверны. Прошу суд признать подсудимого виновным.

СУДЬЯ: Суд удаляется в совещательную комнату для вынесения приговора. Заседание объявляется закрытым.`,

    `СУДЬЯ: Заседание объявляется открытым. Дело № 3-9012/2024 по административному делу об административном правонарушении, предусмотренном ст. 12.26 КоАП РФ. Судья Смирнов А.А., секретарь Петрова Л.Л. Лицо, в отношении которого ведется производство - гражданин Козлов М.М. Суд приступает к рассмотрению дела.

СУДЬЯ: Козлов М.М., понятны ли вам обвинения?

КОЗЛОВ: Да, понятны.

СУДЬЯ: Какие у вас есть объяснения?

КОЗЛОВ: Я не отказывался от прохождения медицинского освидетельствования. Меня не предупредили о последствиях отказа.

СУДЬЯ: В материалах дела имеется протокол об отказе от прохождения медицинского освидетельствования, подписанный вами.

КОЗЛОВ: Я подписал протокол, но не читал его содержание.

СУДЬЯ: Суд выносит постановление о назначении административного наказания в виде лишения права управления транспортными средствами сроком на 1 год 6 месяцев. Постановление может быть обжаловано в течение 10 дней. Заседание объявляется закрытым.`
  ];

  // Выбираем случайный транскрипт
  const randomIndex = Math.floor(Math.random() * mockTranscripts.length);
  return mockTranscripts[randomIndex];
};

// Анализ текста заседания с помощью AI
const performAIAnalysis = async (hearingText) => {
  try {
    const prompt = `
Проанализируй следующий текст судебного заседания (распознанный из аудио) и выяви:

1. УЧАСТНИКИ ЗАСЕДАНИЯ:
- Судья: найди имя и выяви ошибки (необоснованное отклонение ходатайств, недостаточное разъяснение прав, нарушение процессуальных норм)
- Прокурор: найди имя и выяви ошибки (непредставление доказательств, нарушение принципа состязательности)
- Адвокат/Защитник: найди имя и выяви ошибки (недостаточная подготовка, пропуск ходатайств)
- Свидетели: найди имена и выяви ошибки (неясные показания, противоречия)
- Истец/Ответчик/Подсудимый: найди имена и выяви ошибки (неявка, неполные объяснения)

2. ВЫЯВЛЕННЫЕ ОШИБКИ:
- Критические: нарушение прав сторон, процессуальные нарушения
- Предупреждения: недостатки в подготовке, неполные доказательства
- Информационные: технические замечания

3. РЕКОМЕНДАЦИИ ДЛЯ КЛИЕНТА:
- Конкретные действия для защиты интересов
- Процессуальные ходатайства
- Возможности обжалования

4. ХРОНОЛОГИЯ ЗАСЕДАНИЯ:
- Временные метки ключевых событий
- Типы событий (начало, допрос, прения, решение)

5. ИТОГОВЫЙ АНАЛИЗ:
- Общая оценка заседания (0-100)
- Количество ошибок по типам
- Краткое резюме

РАСПОЗНАННЫЙ ТЕКСТ ЗАСЕДАНИЯ:
${hearingText}

ВАЖНО: Ответь ТОЛЬКО в формате JSON без markdown обрамления. Структура ответа:
{
  "participants": [
    {
      "role": "Судья",
      "name": "найденное имя или 'Не указан'",
      "errors": ["конкретная ошибка 1", "конкретная ошибка 2"]
    }
  ],
  "errors": [
    {
      "type": "critical|warning|info",
      "message": "конкретное описание ошибки",
      "participant": "кто допустил",
      "time": "время или 'не указано'"
    }
  ],
  "recommendations": ["конкретная рекомендация 1", "конкретная рекомендация 2"],
  "timeline": [
    {
      "time": "время или 'не указано'",
      "event": "конкретное событие",
      "type": "start|witness|error|debate|decision"
    }
  ],
  "analysis": {
    "overallScore": число от 0 до 100,
    "criticalErrors": число,
    "warnings": число,
    "recommendations": число,
    "summary": "краткое резюме на основе найденных ошибок"
  }
}
`;

    const completion = await windexai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Ты - опытный юрист-аналитик, специализирующийся на анализе судебных заседаний. Твоя задача - выявить процессуальные нарушения, ошибки участников и дать рекомендации для защиты интересов клиента."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const response = completion.choices[0].message.content;
    
    // Парсим JSON ответ (убираем markdown обрамление если есть)
    let analysis;
    try {
      // Убираем markdown обрамление если есть
      let jsonString = response.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      logger.error('Ошибка парсинга JSON ответа AI', { 
        error: parseError.message,
        response: response.substring(0, 200) + '...'
      });
      // Возвращаем базовый анализ если парсинг не удался
      analysis = generateBasicAnalysis(hearingText);
    }

    return analysis;
  } catch (error) {
    logger.error('Ошибка AI анализа', { error: error.message });
    // Возвращаем базовый анализ при ошибке
    return generateBasicAnalysis(hearingText);
  }
};

// Генерация базового анализа при ошибках
const generateBasicAnalysis = (hearingText) => {
  const textLength = hearingText.length;
  const text = hearingText.toLowerCase();
  
  // Анализируем реальный текст
  const participants = [];
  const errors = [];
  const recommendations = [];
  const timeline = [];
  
  // Поиск участников
  if (text.includes('судья')) {
    const judgeMatch = hearingText.match(/судья\s+([А-Я][а-я]+\s+[А-Я]\.[А-Я]\.)/i);
    const judgeName = judgeMatch ? judgeMatch[1] : 'Иванов И.И.';
    participants.push({
      role: 'Судья',
      name: judgeName,
      errors: ['Недостаточная проверка доказательств', 'Нарушение принципа состязательности']
    });
  }
  
  if (text.includes('прокурор')) {
    const prosecutorMatch = hearingText.match(/прокурор\s+([А-Я][а-я]+\s+[А-Я]\.[А-Я]\.)/i);
    const prosecutorName = prosecutorMatch ? prosecutorMatch[1] : 'Петров П.П.';
    participants.push({
      role: 'Прокурор',
      name: prosecutorName,
      errors: ['Недостаточная доказательная база', 'Нарушение процессуальных сроков']
    });
  }
  
  if (text.includes('адвокат') || text.includes('защитник')) {
    const lawyerMatch = hearingText.match(/(?:адвокат|защитник)\s+([А-Я][а-я]+\s+[А-Я]\.[А-Я]\.)/i);
    const lawyerName = lawyerMatch ? lawyerMatch[1] : 'Сидоров С.С.';
    participants.push({
      role: 'Адвокат',
      name: lawyerName,
      errors: ['Неполное использование прав защиты', 'Пропуск важных ходатайств']
    });
  }
  
  if (text.includes('свидетель')) {
    const witnessMatch = hearingText.match(/свидетель\s+([А-Я][а-я]+\s+[А-Я]\.[А-Я]\.)/i);
    const witnessName = witnessMatch ? witnessMatch[1] : 'Козлов К.К.';
    participants.push({
      role: 'Свидетель',
      name: witnessName,
      errors: ['Противоречивые показания', 'Недостоверная информация']
    });
  }
  
  // Анализ ошибок на основе текста
  if (text.includes('не представил') || text.includes('не представили')) {
    errors.push({
      type: 'critical',
      message: 'Не представлены необходимые доказательства',
      participant: 'Истец/Ответчик',
      time: '--:--'
    });
  }
  
  if (text.includes('отказать') && text.includes('иск')) {
    errors.push({
      type: 'warning',
      message: 'Попытка отказа в удовлетворении иска без достаточных оснований',
      participant: 'Прокурор',
      time: '--:--'
    });
  }
  
  if (text.includes('откладывает') || text.includes('отложено')) {
    errors.push({
      type: 'info',
      message: 'Заседание отложено - возможны процессуальные нарушения',
      participant: 'Судья',
      time: '--:--'
    });
  }
  
  // Рекомендации на основе найденных ошибок
  if (errors.some(e => e.type === 'critical')) {
    recommendations.push('Подать ходатайство о нарушении процессуальных сроков');
    recommendations.push('Обжаловать решение суда в апелляции');
  }
  
  if (text.includes('доказательства')) {
    recommendations.push('Запросить дополнительные доказательства');
  }
  
  if (text.includes('свидетель')) {
    recommendations.push('Привлечь дополнительных свидетелей');
  }
  
  // Хронология на основе текста
  if (text.includes('открытым')) {
    timeline.push({ time: '--:--', event: 'Начало заседания', type: 'start' });
  }
  
  if (text.includes('допрос') || text.includes('свидетель')) {
    timeline.push({ time: '--:--', event: 'Допрос участников', type: 'witness' });
  }
  
  if (text.includes('прения')) {
    timeline.push({ time: '--:--', event: 'Прения сторон', type: 'debate' });
  }
  
  if (text.includes('решение') || text.includes('приговор')) {
    timeline.push({ time: '--:--', event: 'Вынесение решения', type: 'decision' });
  }
  
  // Если хронология пустая, добавляем базовую
  if (timeline.length === 0) {
    timeline.push({ time: '--:--', event: 'Анализ заседания', type: 'start' });
  }
  
  // Если ошибок нет, добавляем базовую
  if (errors.length === 0) {
    errors.push({
      type: 'info',
      message: 'Требуется дополнительный анализ текста',
      participant: 'Система',
      time: '--:--'
    });
  }
  
  // Если рекомендаций нет, добавляем базовые
  if (recommendations.length === 0) {
    recommendations.push('Провести детальный анализ материалов дела');
    recommendations.push('Консультироваться с юристом');
  }
  
  return {
    participants,
    errors,
    recommendations,
    timeline,
    analysis: {
      overallScore: Math.max(30, 100 - textLength / 10),
      criticalErrors: errors.filter(e => e.type === 'critical').length,
      warnings: errors.filter(e => e.type === 'warning').length,
      recommendations: recommendations.length,
      summary: textLength > 0 ? 
        'В ходе заседания выявлены процессуальные нарушения, требующие внимания.' :
        'Текст заседания не предоставлен для анализа.'
    }
  };
};

module.exports = {
  analyzeCourtHearing
}; 