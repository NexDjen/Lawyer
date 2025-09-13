const tesseract = require('node-tesseract-ocr');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger');

// Конфигурация Tesseract
const config = {
  lang: 'rus+eng',
  oem: 3,
  psm: 6,
  dpi: 300,
  preprocess: 'contrast'
};

// Обеспечиваем наличие временной директории
const ensureDirExists = async (dirPath) => {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
  } catch (_) {
    // ignore
  }
};

// Нормализация похожих символов между латиницей и кириллицей
const normalizeCyrillicLatinHomoglyphs = (input) => {
  if (!input) return input;
  const map = {
    'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К', 'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х', 'Y': 'У',
    'a': 'а', 'c': 'с', 'e': 'е', 'o': 'о', 'p': 'р', 'x': 'х', 'y': 'у'
  };
  return input.replace(/[ABCEHKMOPTXYaceopxyy]/g, (ch) => map[ch] || ch);
};

// Предобработка изображения для улучшения OCR
const preprocessImage = async (imagePath, options = {}) => {
  const { thresholdLevel = 140 } = options;
  const tempDir = path.join(__dirname, '..', 'temp');
  await ensureDirExists(tempDir);

  const outPath = path.join(
    tempDir,
    `ocr_preprocessed_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
  );

  const image = sharp(imagePath, { failOn: 'none' }).rotate(); // авто-ориентация
  const metadata = await image.metadata();

  // Масштабируем мелкие фото для лучшего распознавания
  const minWidth = 2000;
  const width = metadata.width || minWidth;
  const resized = width < minWidth ? image.resize({ width: minWidth }) : image;

  await resized
    .grayscale()
    .normalize()
    .median(1)
    .blur(0.3)
    .sharpen()
    .threshold(thresholdLevel)
    .toFormat('png')
    .toFile(outPath);

  return outPath;
};

// Мультипроходный OCR с разными предобработками и PSM — выбираем лучший по confidence
const performOCRVariants = async (imagePath, hintedDocumentType = null) => {
  const preprocessedPaths = [];
  try {
    // Две версии бинаризации
    preprocessedPaths.push(await preprocessImage(imagePath, { thresholdLevel: 140 }));
    preprocessedPaths.push(await preprocessImage(imagePath, { thresholdLevel: 170 }));

    const psmVariants = [6, 4, 7, 11, 12];
    let best = { confidence: -1, text: '' };

    for (const pPath of preprocessedPaths) {
      for (const psm of psmVariants) {
        const localCfg = { ...config, psm };
        const raw = await tesseract.recognize(pPath, localCfg);
        const text = normalizeCyrillicLatinHomoglyphs(raw);

        // Оцениваем по извлечённым данным
        const docType = hintedDocumentType || detectDocumentType(text);
        const data = extractDocumentData(text, docType);
        const conf = calculateConfidence(text, data);
        if (conf > best.confidence) {
          best = { confidence: conf, text, documentType: docType, extractedData: data };
        }
      }
    }

    return best;
  } finally {
    // Удаляем временные файлы
    await Promise.all(preprocessedPaths.map(p => fsp.unlink(p).catch(() => {})));
  }
};

// OCR по зонам кадра: верх (выдача) и низ (ФИО)
const ocrZones = async (imagePath) => {
  const tempDir = path.join(__dirname, '..', 'temp');
  await ensureDirExists(tempDir);
  const img = sharp(imagePath, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width === 0 || height === 0) return {};

  const upperRect = { left: 0, top: 0, width, height: Math.round(height * 0.47) };
  const lowerRect = { left: 0, top: Math.round(height * 0.50), width, height: Math.round(height * 0.50) };

  const upperPath = path.join(tempDir, `ocr_upper_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
  const lowerPath = path.join(tempDir, `ocr_lower_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);

  await img.extract(upperRect).toFile(upperPath);
  await img.extract(lowerRect).toFile(lowerPath);

  try {
    const upper = await performOCRVariants(upperPath, 'passport');
    const lower = await performOCRVariants(lowerPath, 'passport');
    return { upperText: upper.text || '', lowerText: lower.text || '' };
  } finally {
    await Promise.all([
      fsp.unlink(upperPath).catch(() => {}),
      fsp.unlink(lowerPath).catch(() => {})
    ]);
  }
};

// Дополнительный цифровой OCR (цифры для серии/номера)
const performDigitOCR = async (imagePath) => {
  const digitConfig = {
    lang: 'eng',
    oem: 3,
    psm: 6,
    dpi: 300,
    tessedit_char_whitelist: '0123456789'
  };

  const preprocessed = await preprocessImage(imagePath);
  try {
    const text = await tesseract.recognize(preprocessed, digitConfig);
    return text.replace(/\D+/g, ' ').trim();
  } finally {
    fsp.unlink(preprocessed).catch(() => {});
  }
};

// Транслитерация латинских имён из MRZ в кириллицу (упрощённая)
const transliterateLatinToCyrillic = (latin) => {
  if (!latin) return '';
  let s = latin.toUpperCase();
  const multi = [
    ['SCH', 'Щ'], ['SH', 'Ш'], ['CH', 'Ч'], ['YA', 'Я'], ['YU', 'Ю'], ['YO', 'Ё'],
    ['ZH', 'Ж'], ['KH', 'Х'], ['TS', 'Ц']
  ];
  for (const [a, b] of multi) s = s.replace(new RegExp(a, 'g'), b);
  const map = {
    'A': 'А', 'B': 'Б', 'C': 'К', 'D': 'Д', 'E': 'Е', 'F': 'Ф', 'G': 'Г', 'H': 'Х',
    'I': 'И', 'J': 'Й', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П',
    'Q': 'К', 'R': 'Р', 'S': 'С', 'T': 'Т', 'U': 'У', 'V': 'В', 'W': 'В', 'X': 'КС',
    'Y': 'Й', 'Z': 'З', '<': ' '
  };
  return s.replace(/[A-Z<]/g, (ch) => map[ch] || ch).replace(/\s+/g, ' ').trim();
};

// Извлечение данных из MRZ (нижняя зона)
const extractFromMRZ = async (imagePath) => {
  try {
    const img = sharp(imagePath, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width === 0 || height === 0) return {};

    const mrzHeight = Math.round(height * 0.18);
    const top = height - mrzHeight;
    const tempDir = path.join(__dirname, '..', 'temp');
    await ensureDirExists(tempDir);
    const mrzPath = path.join(tempDir, `ocr_mrz_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);

    await img.extract({ left: 0, top, width, height: mrzHeight })
      .grayscale()
      .normalize()
      .median(1)
      .sharpen()
      .threshold(160)
      .toFile(mrzPath);

    const mrzCfg = {
      lang: 'eng',
      oem: 3,
      psm: 6,
      dpi: 300,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<0123456789'
    };
    const raw = await tesseract.recognize(mrzPath, mrzCfg);
    await fsp.unlink(mrzPath).catch(() => {});

    const text = raw.replace(/\s+/g, ' ').trim();
    // Пример: PNRUSBUTKO<<ARTEM<MIKHAILOVICH ... 0327069870RUS...
    const nameMatch = text.match(/P\w{2}RUS([A-Z<]+)<<([A-Z<]+)/i) || text.match(/P\wRUS([A-Z<]+)<<([A-Z<]+)/i);
    let lastName = '', firstMiddle = '';
    if (nameMatch) {
      lastName = transliterateLatinToCyrillic(nameMatch[1]);
      firstMiddle = transliterateLatinToCyrillic(nameMatch[2]);
    }
    let firstName = '';
    let middleName = '';
    if (firstMiddle) {
      const parts = firstMiddle.split(' ').filter(Boolean);
      firstName = parts[0] || '';
      middleName = parts[1] || '';
    }
    let series = '';
    let number = '';
    const snMatch = text.match(/(\d{10})RUS/i);
    if (snMatch) {
      const sn = snMatch[1];
      series = sn.slice(0, 4);
      number = sn.slice(4, 10);
    }
    return { lastName, firstName, middleName, series, number };
  } catch (_) {
    return {};
  }
};

// Считывание правой вертикали для серии/номера (поворот и OCR только цифр)
const extractSeriesNumberFromRightEdge = async (imagePath) => {
  try {
    const img = sharp(imagePath, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width === 0 || height === 0) return {};

    // Берём правую полосу ~12% ширины (на фото серия/номер вертикально справа)
    const stripeWidth = Math.round(width * 0.12);
    const extractRegion = { left: Math.max(0, width - stripeWidth), top: 0, width: stripeWidth, height };
    const tempDir = path.join(__dirname, '..', 'temp');
    await ensureDirExists(tempDir);
    const croppedPath = path.join(tempDir, `ocr_right_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);

    await img
      .extract(extractRegion)
      .grayscale()
      .normalize()
      .median(1)
      .sharpen()
      .threshold(150)
      .toFile(croppedPath);

    // Поворачиваем для горизонтального чтения
    const rotatedPath = path.join(tempDir, `ocr_right_rot_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    await sharp(croppedPath).rotate(90).toFile(rotatedPath);

    const digits = await performDigitOCR(rotatedPath);
    await Promise.all([fsp.unlink(croppedPath).catch(() => {}), fsp.unlink(rotatedPath).catch(() => {})]);

    // Ищем серию (2+2) и номер (6 цифр)
    let series = '';
    let number = '';
    const seriesMatch = digits.match(/(\d{2})\s*(\d{2})(?!\d)/);
    if (seriesMatch) series = `${seriesMatch[1]}${seriesMatch[2]}`;
    const numberMatch = digits.match(/(\d{6})/);
    if (numberMatch) number = numberMatch[1];
    return { series, number };
  } catch (_) {
    return {};
  }
};

// Функция для выполнения OCR
const performOCR = async (imagePath) => {
  try {
    logger.info('Начинаем OCR распознавание', { imagePath });
    
    if (!fs.existsSync(imagePath)) {
      throw new Error('Файл не найден');
    }

    // Предобработка + OCR
    const preprocessedPath = await preprocessImage(imagePath);
    let text;
    try {
      const raw = await tesseract.recognize(preprocessedPath, config);
      text = normalizeCyrillicLatinHomoglyphs(raw);
    } finally {
      fsp.unlink(preprocessedPath).catch(() => {});
    }
    
    logger.info('OCR распознавание завершено', { 
      textLength: text.length,
      preview: text.substring(0, 100) + '...'
    });

    return text;
  } catch (error) {
    logger.error('Ошибка OCR распознавания', { error: error.message });
    throw error;
  }
};

// Функция для извлечения данных из распознанного текста
const extractDocumentData = (text, documentType) => {
  const extractedData = {};
  
  try {
    switch (documentType) {
      case 'passport':
        extractedData.series = extractSeries(text);
        extractedData.number = extractNumber(text);
        extractedData.firstName = extractFirstName(text);
        extractedData.lastName = extractLastName(text);
        extractedData.middleName = extractMiddleName(text);
        extractedData.birthDate = extractBirthDate(text);
        extractedData.birthPlace = extractBirthPlace(text);
        extractedData.issueDate = extractIssueDate(text);
        extractedData.issuedBy = extractIssuedBy(text);
        
        // Дополнительная логика для улучшения извлечения
        if (!extractedData.series && !extractedData.number) {
          // Ищем серию и номер в одной строке
          const seriesNumberMatch = text.match(/(\d{4})\s*(\d{6})/);
          if (seriesNumberMatch) {
            extractedData.series = seriesNumberMatch[1];
            extractedData.number = seriesNumberMatch[2];
          }
        }
        
        // Ищем ФИО в одной строке
        if (!extractedData.firstName || !extractedData.lastName) {
          const fullNameMatch = text.match(/([А-Я][а-я]+)\s+([А-Я][а-я]+)\s+([А-Я][а-я]+)/);
          if (fullNameMatch) {
            extractedData.lastName = fullNameMatch[1];
            extractedData.firstName = fullNameMatch[2];
            extractedData.middleName = fullNameMatch[3];
          }
        }
        break;
        
      case 'snils':
        extractedData.number = extractSnilsNumber(text);
        extractedData.firstName = extractFirstName(text);
        extractedData.lastName = extractLastName(text);
        extractedData.middleName = extractMiddleName(text);
        extractedData.registrationDate = extractRegistrationDate(text);
        break;
        
      case 'license':
        extractedData.series = extractLicenseSeries(text);
        extractedData.number = extractNumber(text);
        extractedData.firstName = extractFirstName(text);
        extractedData.lastName = extractLastName(text);
        extractedData.middleName = extractMiddleName(text);
        extractedData.birthDate = extractBirthDate(text);
        extractedData.categories = extractCategories(text);
        extractedData.issueDate = extractIssueDate(text);
        extractedData.expiryDate = extractExpiryDate(text);
        break;
        
      default:
        // Для неизвестных типов документов возвращаем весь текст
        extractedData.text = text;
        break;
    }
    
    // Детальное логирование результатов извлечения
    const foundFields = Object.entries(extractedData)
      .filter(([key, value]) => value && value.length > 0)
      .map(([key, value]) => `${key}: "${value}"`);
    
    logger.info('Данные извлечены', { 
      documentType,
      extractedFields: Object.keys(extractedData).length,
      foundFields: foundFields,
      totalTextLength: text.length
    });
    
    return extractedData;
  } catch (error) {
    logger.error('Ошибка извлечения данных', { error: error.message });
    return { text: text };
  }
};

// Вспомогательные функции для извлечения данных

const extractSeries = (text) => {
  // Ищем серию паспорта в различных форматах
  const patterns = [
    /серия[:\s]*(\d{4})/i,
    /(\d{4})\s*серия/i,
    /серия\s*(\d{4})/i,
    /(\d{4})\s*N/i,
    /N\s*(\d{4})/i,
    /серия[:\s]*(\d{4})/i,
    /(\d{4})/i,  // Просто ищем 4 цифры
    /серия[:\s]*(\d{4})/i,
    /(\d{4})\s*серия/i,
    /серия\s*(\d{4})/i,
    /(\d{4})\s*N/i,
    /N\s*(\d{4})/i,
    /серия[:\s]*(\d{4})/i,
    /(\d{4})/i  // Просто ищем 4 цифры
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  // Ищем 4 цифры подряд в контексте паспорта
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('серия') || line.toLowerCase().includes('паспорт')) {
      const match = line.match(/(\d{4})/);
      if (match) return match[1];
    }
  }
  
  // Ищем любые 4 цифры в тексте
  const allMatches = text.match(/(\d{4})/g);
  if (allMatches && allMatches.length > 0) {
    return allMatches[0];
  }
  
  return '';
};

const extractNumber = (text) => {
  // Ищем номер паспорта в различных форматах
  const patterns = [
    /номер[:\s]*(\d{6})/i,
    /(\d{6})\s*номер/i,
    /номер\s*(\d{6})/i,
    /(\d{6})\s*N/i,
    /N\s*(\d{6})/i,
    /(\d{6})/i  // Просто ищем 6 цифр
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  // Ищем 6 цифр подряд в контексте паспорта
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('номер') || line.toLowerCase().includes('паспорт')) {
      const match = line.match(/(\d{6})/);
      if (match) return match[1];
    }
  }
  
  // Ищем любые 6 цифр в тексте
  const allMatches = text.match(/(\d{6})/g);
  if (allMatches && allMatches.length > 0) {
    return allMatches[0];
  }
  
  return '';
};

const extractFirstName = (text) => {
  // 1) По метке "Имя"
  {
    const labelLine = text.split('\n').find(l => /имя/i.test(l));
    if (labelLine) {
      const m = labelLine.match(/имя\s*[:\-]?\s*([А-Я][а-я]+)/i);
      if (m) return m[1];
    }
  }
  // 2) Пробуем взять слово после строки с фамилией (если найдена)
  {
    const lines = text.split(/\n+/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/фамилия/i.test(line)) {
        const next = lines[i + 1] || '';
        const m = next.match(/^\s*([А-Я][а-я]{2,})\b/);
        if (m) return m[1];
      }
    }
  }
  // 3) Общие имена
  const commonNames = ['артем', 'артемий', 'михаил', 'иван', 'пётр', 'петр', 'сергей', 'александр', 'дмитрий', 'андрей', 'николай', 'алексей', 'мария', 'анна', 'елена', 'ольга', 'наталья', 'ирина', 'татьяна', 'светлана', 'юлия', 'екатерина'];
  for (const name of commonNames) {
    const re = new RegExp(`\b(${name})\b`, 'i');
    const lower = text.toLowerCase();
    const m = lower.match(re);
    if (m) {
      const orig = text.match(new RegExp(`([А-Я][а-я]*${name.slice(1)})`, 'i'));
      if (orig) return orig[1];
    }
  }
  return '';
};

const extractLastName = (text) => {
  // 1) По метке "Фамилия" — следующее слово в следующей строке
  const lines = text.split(/\n+/);
  for (let i = 0; i < lines.length; i += 1) {
    if (/фамилия/i.test(lines[i])) {
      const next = lines[i + 1] || '';
      const m = next.match(/^\s*([А-Я][А-Яа-я-]{2,})\b/);
      if (m) return m[1].replace(/[^А-Яа-я-]/g, '');
    }
  }
  // 2) В MRZ (если распозналось): фамилия идёт до <<
  const mrzMatch = text.match(/P<N?R?U?S?([A-Z<]+)/i);
  if (mrzMatch) {
    const mrzSurname = mrzMatch[1].replace(/</g, ' ').trim();
    // Транслит не восстанавливаем, но фамилия латиницей может помочь в валидации
    if (mrzSurname && mrzSurname.length > 2) return mrzSurname;
  }
  return '';
};

const extractMiddleName = (text) => {
  // По метке "Отчество" — следующее слово в следующей строке
  const lines = text.split(/\n+/);
  for (let i = 0; i < lines.length; i += 1) {
    if (/отчество/i.test(lines[i])) {
      const next = lines[i + 1] || '';
      const m = next.match(/^\s*([А-Я][а-я]{3,})\b/);
      if (m) return m[1];
    }
  }
  return '';
};

const extractBirthDate = (text) => {
  // Ищем дату рождения в различных форматах
  const patterns = [
    /дата рождения[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i,
    /(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})\s*дата рождения/i,
    /родился[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i,
    /рождения[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i,
    /\b(\d{2}[.\-]\d{2}[.\-]\d{4})\b/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  // Ищем даты в контексте рождения
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('рождения') || line.toLowerCase().includes('родился')) {
      const match = line.match(/(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/);
      if (match) return match[1];
    }
  }
  
  // Ищем любые даты в формате ДД.ММ.ГГГГ
  const dateMatch = text.match(/(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/);
  if (dateMatch) return dateMatch[1];
  
  return '';
};

const extractBirthPlace = (text) => {
  // Ищем место рождения в различных форматах
  const patterns = [
    /место рождения[:\s]*([А-Я][а-я\s,.-]+?)(?=\n|$)/i,
    /родился[:\s]*([А-Я][а-я\s,.-]+?)(?=\n|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  // Ищем города/места в контексте рождения
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('рождения') || line.toLowerCase().includes('родился')) {
      const match = line.match(/([А-Я][а-я\s,.-]{3,})/);
      if (match) return match[1].trim();
    }
  }
  
  return '';
};

const extractIssueDate = (text) => {
  // Ищем дату выдачи в различных форматах
  const patterns = [
    /дата выдачи[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i,
    /(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})\s*дата выдачи/i,
    /выдан[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i,
    /выдачи[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  // Ищем даты в контексте выдачи
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('выдачи') || line.toLowerCase().includes('выдан')) {
      const match = line.match(/(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/);
      if (match) return match[1];
    }
  }
  
  return '';
};

const extractIssuedBy = (text) => {
  // Ищем кем выдан в различных форматах
  const patterns = [
    /кем выдан[:\s]*([А-Я][а-я\s,.-]+)/i,
    /([А-Я][а-я\s,.-]+)\s*кем выдан/i,
    /выдан[:\s]*([А-Я][а-я\s,.-]+)/i,
    /уфмс[:\s]*([А-Я][а-я\s,.-]+)/i,
    /мвд[:\s]*([А-Я][а-я\s,.-]+)/i,
    /(ГУ\s*МВД\s*России\s*по\s*[А-Я][а-я\s-]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  // Ищем организации в контексте выдачи
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('выдан') || line.toLowerCase().includes('уфмс') || line.toLowerCase().includes('мвд')) {
      const match = line.match(/([А-Я][а-я\s,.-]{5,})/);
      if (match) return match[1].trim();
    }
  }
  
  return '';
};

const extractSnilsNumber = (text) => {
  const match = text.match(/(\d{3}-\d{3}-\d{3}\s\d{2})/);
  return match ? match[1] : '';
};

const extractRegistrationDate = (text) => {
  const match = text.match(/дата регистрации[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i);
  return match ? match[1] : '';
};

const extractLicenseSeries = (text) => {
  const match = text.match(/серия[:\s]*(\d{2}\s[А-Я]{2})/i);
  return match ? match[1] : '';
};

const extractCategories = (text) => {
  const match = text.match(/категории[:\s]*([A-Z,\s]+)/i);
  return match ? match[1].trim() : '';
};

const extractExpiryDate = (text) => {
  const match = text.match(/срок действия[:\s]*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/i);
  return match ? match[1] : '';
};

// Функция для определения типа документа по тексту
const detectDocumentType = (text) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('паспорт') || lowerText.includes('серия') && lowerText.includes('номер')) {
    return 'passport';
  }
  
  if (lowerText.includes('снилс') || lowerText.includes('страховой номер')) {
    return 'snils';
  }
  
  if (lowerText.includes('водительское') || lowerText.includes('права') || lowerText.includes('категории')) {
    return 'license';
  }
  
  if (lowerText.includes('свидетельство о рождении')) {
    return 'birth';
  }
  
  if (lowerText.includes('инн') || lowerText.includes('идентификационный номер')) {
    return 'inn';
  }
  
  return 'unknown';
};

// Функция для тестирования OCR с текстовыми данными
const testOCRWithText = async (text, documentType = 'passport') => {
  try {
    logger.info('Тестирование OCR с текстовыми данными', { 
      textLength: text.length,
      documentType 
    });
    
    // Определяем тип документа, если не указан
    if (!documentType) {
      documentType = detectDocumentType(text);
      logger.info('Определен тип документа', { documentType });
    }
    
    // Извлекаем данные
    const extractedData = extractDocumentData(text, documentType);
    
    // Вычисляем уверенность в распознавании
    const confidence = calculateConfidence(text, extractedData);
    
    return {
      extractedData,
      confidence,
      documentType,
      recognizedText: text
    };
    
  } catch (error) {
    logger.error('Ошибка тестирования OCR', { error: error.message });
    throw error;
  }
};

// Основная функция для обработки документа
const processDocumentWithOCR = async (filePath, documentType = null) => {
  try {
    logger.info('Начинаем обработку документа с OCR', { filePath, documentType });
    
    // Базовый OCR
    let recognizedText = await performOCR(filePath);
    
    // Определяем тип документа, если не указан
    if (!documentType) {
      documentType = detectDocumentType(recognizedText);
      logger.info('Определен тип документа', { documentType });
    }
    
    // Извлекаем данные
    let extractedData = extractDocumentData(recognizedText, documentType);
    let confidence = calculateConfidence(recognizedText, extractedData);

    // Мультипроходный OCR: пытаемся улучшить результат
    try {
      const variant = await performOCRVariants(filePath, documentType);
      if (variant.confidence > confidence) {
        logger.info('Выбран улучшенный вариант OCR', { prevConfidence: confidence, newConfidence: variant.confidence });
        recognizedText = variant.text;
        extractedData = variant.extractedData;
        confidence = variant.confidence;
        // Уточняем тип, если не был указан
        if (!documentType && variant.documentType) {
          documentType = variant.documentType;
        }
      }
    } catch (e) {
      logger.warn('Мультипроходный OCR не удался', { error: e.message });
    }

    // Если серия/номер не распознаны — пробуем цифровой OCR
    const missingSeries = !extractedData.series || extractedData.series.length === 0;
    const missingNumber = !extractedData.number || extractedData.number.length === 0;
    if (missingSeries || missingNumber) {
      logger.info('Серия/номер не найдены — выполняем дополнительный цифровой OCR');
      try {
        const digitsOnly = await performDigitOCR(filePath);
        const match = digitsOnly.match(/(\d{4})\D{0,3}(\d{6})/);
        if (match) {
          if (missingSeries) extractedData.series = match[1];
          if (missingNumber) extractedData.number = match[2];
          logger.info('Дополнительно извлечены серия/номер', { series: extractedData.series, number: extractedData.number });
        }
        // Если не нашли — попробуем правую вертикальную полосу
        if ((!extractedData.series || !extractedData.number)) {
          const edge = await extractSeriesNumberFromRightEdge(filePath);
          if (edge.series && !extractedData.series) extractedData.series = edge.series;
          if (edge.number && !extractedData.number) extractedData.number = edge.number;
          if (edge.series || edge.number) {
            logger.info('Извлечены серия/номер с правой полосы', { series: extractedData.series, number: extractedData.number });
          }
        }
        // Если всё ещё нет — пробуем вытащить из MRZ
        if ((!extractedData.series || !extractedData.number)) {
          const mrz = await extractFromMRZ(filePath);
          if (mrz.series && !extractedData.series) extractedData.series = mrz.series;
          if (mrz.number && !extractedData.number) extractedData.number = mrz.number;
          if (mrz.series || mrz.number) {
            logger.info('Извлечены серия/номер из MRZ', { series: extractedData.series, number: extractedData.number });
          }
        }
      } catch (e) {
        logger.warn('Не удалось выполнить цифровой OCR', { error: e.message });
      }
    }
    
    // Если ФИО не распознаны — пробуем нижнюю зону
    const missingName = !extractedData.firstName || !extractedData.lastName;
    if (missingName) {
      try {
        const { lowerText } = await ocrZones(filePath);
        if (lowerText) {
          const dataLower = extractDocumentData(lowerText, documentType);
          if (!extractedData.lastName && dataLower.lastName) extractedData.lastName = dataLower.lastName;
          if (!extractedData.firstName && dataLower.firstName) extractedData.firstName = dataLower.firstName;
          if (!extractedData.middleName && dataLower.middleName) extractedData.middleName = dataLower.middleName;
        }
      } catch (e) {
        logger.warn('Зональный OCR (нижняя часть) не удался', { error: e.message });
      }
    }

    // Если "Кем выдан"/дата выдачи не распознаны — пробуем верхнюю зону
    if (!extractedData.issuedBy || !extractedData.issueDate) {
      try {
        const { upperText } = await ocrZones(filePath);
        if (upperText) {
          const upData = extractDocumentData(upperText, documentType);
          if (!extractedData.issuedBy && upData.issuedBy) extractedData.issuedBy = upData.issuedBy;
          if (!extractedData.issueDate && upData.issueDate) extractedData.issueDate = upData.issueDate;
        }
      } catch (e) {
        logger.warn('Зональный OCR (верхняя часть) не удался', { error: e.message });
      }
    }

    // Усиливаем ФИО и номер из MRZ при необходимости
    try {
      const mrz = await extractFromMRZ(filePath);
      if (mrz.lastName && !extractedData.lastName) extractedData.lastName = mrz.lastName;
      if (mrz.firstName && !extractedData.firstName) extractedData.firstName = mrz.firstName;
      if (mrz.middleName && !extractedData.middleName) extractedData.middleName = mrz.middleName;
      if (mrz.series && !extractedData.series) extractedData.series = mrz.series;
      if (mrz.number && !extractedData.number) extractedData.number = mrz.number;
    } catch (_) {}

    // Пересчитываем уверенность после возможных улучшений
    confidence = calculateConfidence(recognizedText, extractedData);
    
    return {
      extractedData,
      confidence,
      documentType,
      recognizedText
    };
    
  } catch (error) {
    logger.error('Ошибка обработки документа с OCR', { error: error.message });
    throw error;
  }
};

// Функция для вычисления уверенности в распознавании
const calculateConfidence = (text, extractedData) => {
  let confidence = 0.3; // Базовая уверенность
  
  // Увеличиваем уверенность за каждый найденный важный элемент
  const importantFields = ['firstName', 'lastName', 'series', 'number'];
  const foundFields = importantFields.filter(field => extractedData[field] && extractedData[field].length > 0);
  
  confidence += (foundFields.length / importantFields.length) * 0.4;
  
  // Увеличиваем уверенность за качество текста
  if (text.length > 50) {
    confidence += 0.1;
  }
  if (text.length > 100) {
    confidence += 0.1;
  }
  
  // Увеличиваем уверенность за наличие ключевых слов
  const keyWords = ['паспорт', 'серия', 'номер', 'имя', 'фамилия', 'отчество', 'рождения', 'выдачи'];
  const foundKeyWords = keyWords.filter(word => text.toLowerCase().includes(word));
  confidence += (foundKeyWords.length / keyWords.length) * 0.2;
  
  // Ограничиваем уверенность до 1.0
  return Math.min(confidence, 1.0);
};

module.exports = {
  performOCR,
  extractDocumentData,
  detectDocumentType,
  processDocumentWithOCR,
  testOCRWithText
}; 