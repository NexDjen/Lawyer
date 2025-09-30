const logger = require('../utils/logger');

/**
 * Сервис для извлечения персональных данных из сообщений пользователя
 */
class PersonalDataExtractor {
  constructor() {
    // Регулярные выражения для распознавания различных типов данных
    this.patterns = {
      // ФИО
      fullName: {
        patterns: [
          /(?:меня зовут|я|мое имя|фамилия)\s+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/gi,
          /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)(?:\s+(?:это|мое|моя))/gi,
          /фио[:\s]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/gi
        ],
        field: 'fullName'
      },
      
      // Имя
      firstName: {
        patterns: [
          /(?:меня зовут|я|мое имя)\s+([А-ЯЁ][а-яё]+)(?:\s|$|,|\.)/gi,
          /имя[:\s]+([А-ЯЁ][а-яё]+)/gi
        ],
        field: 'firstName'
      },
      
      // Фамилия
      lastName: {
        patterns: [
          /фамилия[:\s]+([А-ЯЁ][а-яё]+)/gi,
          /моя фамилия\s+([А-ЯЁ][а-яё]+)/gi
        ],
        field: 'lastName'
      },
      
      // Отчество
      middleName: {
        patterns: [
          /отчество[:\s]+([А-ЯЁ][а-яё]+)/gi,
          /мое отчество\s+([А-ЯЁ][а-яё]+)/gi
        ],
        field: 'middleName'
      },
      
      // Дата рождения
      birthDate: {
        patterns: [
          /(?:родился|родилась|дата рождения|рожден)\s*(?:в|)\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/gi,
          /(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})\s*(?:года рождения|г\.р\.|рождения)/gi,
          /дата рождения[:\s]+(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/gi
        ],
        field: 'birthDate'
      },
      
      // Место рождения
      birthPlace: {
        patterns: [
          /(?:родился|родилась)\s+в\s+([а-яёА-ЯЁ\s\-]+)/gi,
          /место рождения[:\s]+([а-яёА-ЯЁ\s\-]+)/gi
        ],
        field: 'birthPlace'
      },
      
      // Адрес
      address: {
        patterns: [
          /(?:живу|проживаю|адрес|прописан)\s+(?:по адресу|в|на)\s+([а-яёА-ЯЁ0-9\s,\.\-\/]+)/gi,
          /адрес[:\s]+([а-яёА-ЯЁ0-9\s,\.\-\/]+)/gi,
          /(?:г\.|город)\s+([а-яёА-ЯЁ\s\-]+),?\s*(?:ул\.|улица)\s+([а-яёА-ЯЁ0-9\s\-]+)/gi
        ],
        field: 'address'
      },
      
      // Телефон
      phone: {
        patterns: [
          /(?:телефон|номер|тел\.?)[:\s]*(\+?[78][\s\-\(\)]?\d{3}[\s\-\(\)]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/gi,
          /(\+?[78][\s\-\(\)]?\d{3}[\s\-\(\)]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/gi
        ],
        field: 'phone'
      },
      
      // Email
      email: {
        patterns: [
          /(?:email|почта|e-mail)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
        ],
        field: 'email'
      },
      
      // Паспортные данные
      passportSeries: {
        patterns: [
          /паспорт.*серия[:\s]*(\d{4})/gi,
          /серия паспорта[:\s]*(\d{4})/gi
        ],
        field: 'passportSeries'
      },
      
      passportNumber: {
        patterns: [
          /паспорт.*номер[:\s]*(\d{6})/gi,
          /номер паспорта[:\s]*(\d{6})/gi,
          /серия\s+\d{4}\s+номер\s+(\d{6})/gi
        ],
        field: 'passportNumber'
      },
      
      // ИНН
      inn: {
        patterns: [
          /инн[:\s]*(\d{10,12})/gi,
          /(?:мой|мое)\s+инн[:\s]*(\d{10,12})/gi
        ],
        field: 'inn'
      },
      
      // СНИЛС
      snils: {
        patterns: [
          /снилс[:\s]*(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2})/gi,
          /страховой номер[:\s]*(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2})/gi
        ],
        field: 'snils'
      },
      
      // Семейное положение
      maritalStatus: {
        patterns: [
          /(?:я|)\s*(?:женат|замужем|холост|не замужем|разведен|разведена|вдовец|вдова)/gi,
          /семейное положение[:\s]*(женат|замужем|холост|не замужем|разведен|разведена|вдовец|вдова)/gi
        ],
        field: 'maritalStatus'
      },
      
      // Профессия/работа
      occupation: {
        patterns: [
          /(?:работаю|я|профессия|должность)[:\s]+([а-яёА-ЯЁ\s]+)/gi,
          /по профессии\s+([а-яёА-ЯЁ\s]+)/gi,
          /работаю\s+([а-яёА-ЯЁ\s]+)/gi
        ],
        field: 'occupation'
      },
      
      // Место работы
      workplace: {
        patterns: [
          /работаю в\s+([а-яёА-ЯЁ0-9\s\-\"\.]+)/gi,
          /место работы[:\s]+([а-яёА-ЯЁ0-9\s\-\"\.]+)/gi,
          /в компании\s+([а-яёА-ЯЁ0-9\s\-\"\.]+)/gi
        ],
        field: 'workplace'
      }
    };
    
    // Ключевые слова для определения важности информации
    this.importanceKeywords = [
      'мое дело', 'моя ситуация', 'моя проблема', 'мой случай',
      'история дела', 'суть проблемы', 'что произошло',
      'договор', 'соглашение', 'контракт', 'сделка',
      'суд', 'иск', 'дело', 'спор', 'конфликт',
      'нарушение', 'ущерб', 'компенсация', 'возмещение'
    ];
  }

  /**
   * Извлекает персональные данные из текста сообщения
   * @param {string} message - Текст сообщения
   * @param {Object} existingProfile - Существующий профиль пользователя
   * @returns {Object} Извлеченные данные
   */
  extractPersonalData(message, existingProfile = {}) {
    const extractedData = {};
    const caseNotes = [];
    
    try {
      // Проходим по всем паттернам и извлекаем данные
      for (const [dataType, config] of Object.entries(this.patterns)) {
        for (const pattern of config.patterns) {
          const matches = message.matchAll(pattern);
          
          for (const match of matches) {
            if (match[1] && match[1].trim()) {
              let value = match[1].trim();
              
              // Очистка и нормализация данных
              value = this.normalizeData(value, config.field);
              
              // Проверяем, что это новые данные или более полные
              if (this.isNewOrBetterData(value, existingProfile[config.field])) {
                extractedData[config.field] = value;
                
                logger.info('Извлечены персональные данные', {
                  field: config.field,
                  value: this.maskSensitiveData(value, config.field),
                  pattern: pattern.source
                });
              }
            }
          }
        }
      }
      
      // Извлекаем важную информацию о деле
      const caseInfo = this.extractCaseInformation(message);
      if (caseInfo) {
        caseNotes.push({
          timestamp: new Date().toISOString(),
          content: caseInfo,
          importance: this.calculateImportance(message)
        });
      }
      
      return {
        personalData: extractedData,
        caseNotes: caseNotes,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Ошибка извлечения персональных данных', { error: error.message });
      return { personalData: {}, caseNotes: [] };
    }
  }

  /**
   * Нормализует извлеченные данные
   * @param {string} value - Значение для нормализации
   * @param {string} fieldType - Тип поля
   * @returns {string} Нормализованное значение
   */
  normalizeData(value, fieldType) {
    switch (fieldType) {
      case 'phone':
        // Нормализация телефона
        return value.replace(/[\s\-\(\)]/g, '').replace(/^8/, '+7');
        
      case 'email':
        return value.toLowerCase();
        
      case 'fullName':
      case 'firstName':
      case 'lastName':
      case 'middleName':
        // Приведение имен к правильному регистру
        return value.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
      case 'birthDate':
        // Нормализация даты
        return this.normalizeBirthDate(value);
        
      case 'inn':
      case 'snils':
      case 'passportSeries':
      case 'passportNumber':
        // Удаление всех не-цифровых символов
        return value.replace(/\D/g, '');
        
      default:
        return value.trim();
    }
  }

  /**
   * Нормализует дату рождения
   * @param {string} dateStr - Строка с датой
   * @returns {string} Нормализованная дата в формате DD.MM.YYYY
   */
  normalizeBirthDate(dateStr) {
    // Приводим к формату DD.MM.YYYY
    const cleanDate = dateStr.replace(/[\-\/]/g, '.');
    const parts = cleanDate.split('.');
    
    if (parts.length === 3) {
      let [day, month, year] = parts;
      
      // Приводим год к 4-значному формату
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        year = parseInt(year) > 50 ? (currentCentury - 100 + parseInt(year)) : (currentCentury + parseInt(year));
      }
      
      // Добавляем ведущие нули
      day = day.padStart(2, '0');
      month = month.padStart(2, '0');
      
      return `${day}.${month}.${year}`;
    }
    
    return dateStr;
  }

  /**
   * Проверяет, являются ли новые данные лучше существующих
   * @param {string} newValue - Новое значение
   * @param {string} existingValue - Существующее значение
   * @returns {boolean} True, если новые данные лучше
   */
  isNewOrBetterData(newValue, existingValue) {
    if (!existingValue) return true;
    if (newValue.length > existingValue.length) return true;
    if (newValue !== existingValue) return true;
    return false;
  }

  /**
   * Извлекает информацию о деле из сообщения
   * @param {string} message - Текст сообщения
   * @returns {string|null} Важная информация о деле
   */
  extractCaseInformation(message) {
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const importantSentences = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      
      // Проверяем наличие ключевых слов
      const hasImportantKeywords = this.importanceKeywords.some(keyword => 
        lowerSentence.includes(keyword.toLowerCase())
      );
      
      if (hasImportantKeywords) {
        importantSentences.push(sentence.trim());
      }
    }
    
    return importantSentences.length > 0 ? importantSentences.join('. ') : null;
  }

  /**
   * Вычисляет важность сообщения
   * @param {string} message - Текст сообщения
   * @returns {number} Оценка важности от 1 до 10
   */
  calculateImportance(message) {
    const lowerMessage = message.toLowerCase();
    let importance = 1;
    
    // Увеличиваем важность на основе ключевых слов
    const keywordMatches = this.importanceKeywords.filter(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    ).length;
    
    importance += Math.min(keywordMatches * 2, 7);
    
    // Учитываем длину сообщения
    if (message.length > 200) importance += 1;
    if (message.length > 500) importance += 1;
    
    return Math.min(importance, 10);
  }

  /**
   * Маскирует чувствительные данные для логирования
   * @param {string} value - Значение для маскирования
   * @param {string} fieldType - Тип поля
   * @returns {string} Замаскированное значение
   */
  maskSensitiveData(value, fieldType) {
    switch (fieldType) {
      case 'phone':
        return value.replace(/(\+\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1***$3**$5');
      case 'email':
        const [local, domain] = value.split('@');
        return `${local.charAt(0)}***@${domain}`;
      case 'passportSeries':
      case 'passportNumber':
      case 'inn':
      case 'snils':
        return `${value.slice(0, 2)}***${value.slice(-2)}`;
      default:
        return value.length > 10 ? `${value.slice(0, 3)}***${value.slice(-3)}` : value;
    }
  }
}

module.exports = PersonalDataExtractor;

