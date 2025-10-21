const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const Tesseract = require('tesseract.js');

// Функция для обновления статистики OpenAI
const updateOpenAIStats = async (tokens, cost = 0) => {
  try {
    const apiStatsService = require('./apiStatsService');
    await apiStatsService.updateApiStats('system', 'ocr', 'gpt-4o', tokens, cost, 0);
    
    logger.info('OpenAI статистика обновлена в БД', { tokens, cost });
  } catch (error) {
    logger.warn('Не удалось обновить статистику OpenAI', { error: error.message });
  }
};

class OpenAIVisionOCR {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.WINDEXAI_API_KEY
    });
  }

  async extractTextFromImage(imagePath, documentType = 'unknown') {
    try {
      logger.info('OpenAI Vision OCR started', { imagePath, documentType });
      
      // Читаем изображение как base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Определяем MIME тип
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      
      // Создаем промпт в зависимости от типа документа
      const prompt = this.getPromptForDocumentType(documentType);
      
      // Для паспортов пробуем специальный подход с поиском серии и номера
      let response;
      if (documentType === 'passport') {
        try {
          // Сначала пробуем специальный промпт для поиска серии и номера
          response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Найди на этом изображении российского паспорта ВСЕ цифры и извлеки их в формате JSON. Особенно ищи:
1. Серию паспорта (4 цифры, например: 03 20)
2. Номер паспорта (6 цифр, например: 706987)
3. Все остальные данные

Формат ответа:
{
  "series": "серия паспорта",
  "number": "номер паспорта",
  "firstName": "имя",
  "lastName": "фамилия",
  "middleName": "отчество",
  "birthDate": "дата рождения",
  "birthPlace": "место рождения",
  "issuedBy": "кем выдан",
  "issueDate": "дата выдачи",
  "departmentCode": "код подразделения"
}

ОБЯЗАТЕЛЬНО найди серию и номер! Они могут быть вертикально по правому краю или в машиночитаемой зоне. Отвечай только JSON.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            max_tokens: 2000,
            temperature: 0.1
          });
        } catch (error) {
          logger.warn('Специальный промпт не сработал, пробуем стандартный', { error: error.message });
          // Если специальный промпт не сработал, пробуем стандартный
          response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            max_tokens: 2000,
            temperature: 0.1
          });
        }
      } else {
        // Для других документов используем стандартный подход
        response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        });
      }

      const extractedText = response.choices[0].message.content;
      const tokens = response.usage?.total_tokens || 0;
      
      // Проверяем, не отказался ли OpenAI обрабатывать документ
      if (extractedText.includes("I'm sorry") || extractedText.includes("can't assist") || extractedText.includes("policy") || extractedText.includes("refuse") || extractedText.includes("unable")) {
        logger.warn('OpenAI отказался обрабатывать документ, используем Tesseract fallback');
        throw new Error('OpenAI policy restriction - using Tesseract fallback');
      }
      
      logger.info('OpenAI Vision OCR completed', { 
        textLength: extractedText.length,
        tokens: tokens
      });

      // Обновляем статистику
      await updateOpenAIStats(tokens);

      return {
        text: extractedText,
        confidence: 0.95, // OpenAI Vision очень точный
        tokens: tokens
      };

    } catch (error) {
      logger.error('OpenAI Vision OCR failed', { error: error.message });
      // Fallback to Tesseract OCR for better robustness
      logger.warn('Using Tesseract.js fallback for OCR');
      try {
        const result = await Tesseract.recognize(imagePath, 'rus+eng', { logger: m => logger.info('Tesseract OCR', m) });
        const fallbackText = result.data.text;
        logger.info('Tesseract OCR completed', { textLength: fallbackText.length });
        return {
          text: fallbackText,
          confidence: result.data.confidence || 0.7,
          tokens: 0
        };
      } catch (tErr) {
        logger.error('Tesseract OCR fallback failed', { error: tErr.message });
        throw tErr;
      }
    }
  }

  getPromptForDocumentType(documentType) {
    const prompts = {
      passport: `Проанализируй изображение российского паспорта и извлеки ВСЕ данные в формате JSON. 

КРИТИЧЕСКИ ВАЖНО: Серия и номер паспорта - это обязательные поля! Они могут быть:
1. Написаны вертикально по правому краю страницы (например: 03 20 706987)
2. В машиночитаемой зоне внизу документа
3. В виде отдельных цифр в разных местах

Ищи внимательно все цифровые последовательности!

{
  "series": "серия паспорта (4 цифры, например: 03 20)",
  "number": "номер паспорта (6 цифр, например: 706987)", 
  "firstName": "имя",
  "lastName": "фамилия",
  "middleName": "отчество",
  "birthDate": "дата рождения в формате ДД.ММ.ГГГГ",
  "birthPlace": "место рождения",
  "issuedBy": "кем выдан",
  "issueDate": "дата выдачи в формате ДД.ММ.ГГГГ",
  "departmentCode": "код подразделения"
}

ОБЯЗАТЕЛЬНО найди серию и номер! Если не видишь их явно, попробуй найти любые цифровые последовательности в формате XX XX XXXXXX или XXXXXX. Отвечай только JSON.`,

      driver_license: `Проанализируй изображение водительского удостоверения и извлеки следующую информацию в формате JSON:
{
  "series": "серия",
  "number": "номер",
  "firstName": "имя",
  "lastName": "фамилия", 
  "middleName": "отчество",
  "birthDate": "дата рождения в формате ДД.ММ.ГГГГ",
  "issueDate": "дата выдачи в формате ДД.ММ.ГГГГ",
  "expiryDate": "дата окончания в формате ДД.ММ.ГГГГ",
  "categories": "категории водительских прав",
  "issuedBy": "кем выдано"
}

Если какое-то поле не найдено, укажи null. Отвечай только JSON без дополнительного текста.`,

      snils: `Проанализируй изображение СНИЛС и извлеки следующую информацию в формате JSON:
{
  "number": "номер СНИЛС",
  "firstName": "имя",
  "lastName": "фамилия",
  "middleName": "отчество", 
  "birthDate": "дата рождения в формате ДД.ММ.ГГГГ",
  "gender": "пол"
}

Если какое-то поле не найдено, укажи null. Отвечай только JSON без дополнительного текста.`,

      inn: `Проанализируй изображение ИНН и извлеки следующую информацию в формате JSON:
{
  "inn": "номер ИНН",
  "firstName": "имя",
  "lastName": "фамилия",
  "middleName": "отчество",
  "birthDate": "дата рождения в формате ДД.ММ.ГГГГ"
}

Если какое-то поле не найдено, укажи null. Отвечай только JSON без дополнительного текста.`,

      default: `Проанализируй изображение документа и извлеки весь видимый текст. 
Отвечай в формате JSON:
{
  "extractedText": "весь текст с документа",
  "documentType": "тип документа если можно определить",
  "keyFields": {
    "field1": "значение1",
    "field2": "значение2"
  }
}

Отвечай только JSON без дополнительного текста.`
    };

    return prompts[documentType] || prompts.default;
  }

  async extractFieldsFromText(text, documentType) {
    try {
      logger.info('Extracting fields from OpenAI response', { 
        textLength: text.length, 
        documentType,
        textPreview: text.substring(0, 200) 
      });

      // Пытаемся распарсить JSON из текста
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.info('Successfully parsed JSON from OpenAI response', { 
          fields: Object.keys(parsed).length,
          parsedData: parsed 
        });
        return {
          extractedData: parsed,
          confidence: 0.95,
          recognizedText: text
        };
      }

      // Если JSON не найден, попробуем извлечь данные вручную для паспорта
      if (documentType === 'passport') {
        const extractedData = this.extractPassportFieldsManually(text);
        logger.info('Manual passport field extraction', { 
          fields: Object.keys(extractedData).length,
          extractedData 
        });
        return {
          extractedData,
          confidence: 0.8,
          recognizedText: text
        };
      }

      // Если JSON не найден, возвращаем весь текст
      logger.warn('No JSON found in OpenAI response, returning raw text');
      return {
        extractedData: { extractedText: text },
        confidence: 0.8,
        recognizedText: text
      };

    } catch (error) {
      logger.warn('Failed to parse OpenAI OCR result as JSON', { error: error.message });
      return {
        extractedData: { extractedText: text },
        confidence: 0.8,
        recognizedText: text
      };
    }
  }

  extractPassportFieldsManually(text) {
    const fields = {
      series: null,
      number: null,
      firstName: null,
      lastName: null,
      middleName: null,
      birthDate: null,
      birthPlace: null,
      issuedBy: null,
      issueDate: null,
      departmentCode: null
    };

    // Улучшенные регулярные выражения для извлечения данных
    const patterns = {
      series: /[Сс]ерия[:\s]*(\d{2}\s*\d{2})/i,
      number: /[Нн]омер[:\s]*(\d{6})/i,
      lastName: /[Фф]амилия[:\s]*([А-ЯЁ][а-яё]+)/i,
      firstName: /[Ии]мя[:\s]*([А-ЯЁ][а-яё]+)/i,
      middleName: /[Оо]тчество[:\s]*([А-ЯЁ][а-яё]+)/i,
      birthDate: /[Дд]ата рождения[:\s]*(\d{2}\.\d{2}\.\d{4})/i,
      birthPlace: /[Мм]есто рождения[:\s]*([^,\n]+)/i,
      issuedBy: /[Вв]ыдан[:\s]*([^,\n]+)/i,
      issueDate: /[Дд]ата выдачи[:\s]*(\d{2}\.\d{2}\.\d{4})/i,
      departmentCode: /[Кк]од подразделения[:\s]*(\d{3}-\d{3})/i
    };

    // Дополнительные паттерны для серии и номера из машиночитаемой зоны
    const mrzPatterns = {
      series: /(\d{2})\s*(\d{2})\s*(\d{6})/,
      number: /(\d{2})\s*(\d{2})\s*(\d{6})/
    };

    // Извлекаем все поля
    Object.keys(patterns).forEach(field => {
      const match = text.match(patterns[field]);
      if (match) {
        fields[field] = match[1].trim();
      }
    });

    // Дополнительная попытка извлечь серию и номер из машиночитаемой зоны
    const mrzMatch = text.match(mrzPatterns.series);
    if (mrzMatch && !fields.series) {
      fields.series = `${mrzMatch[1]} ${mrzMatch[2]}`;
      fields.number = mrzMatch[3];
    }

    return fields;
  }
}

module.exports = { OpenAIVisionOCR };
