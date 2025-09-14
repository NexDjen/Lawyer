const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const ErrorHandler = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const axios = require('axios');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, BorderStyle } = require('docx');

// Основной маршрут для обработки сообщений чата (без дублирования пути)
router.post('/', chatController.handleChatMessage);

// Маршрут для получения статистики использования
router.get('/stats', chatController.getUsageStats);

// Маршрут для проверки состояния API
router.get('/status', chatController.checkApiStatus);

// Маршрут для получения информации о модели
router.get('/model', chatController.getModelInfo);

// TTS WindexAI endpoint
router.post('/windexai-tts', ErrorHandler.asyncHandler(async (req, res) => {
  const { text, voice = 'nova', model = 'tts-1' } = req.body;
  
  logger.info('TTS request received:', { textLength: text?.length, voice, model });
  
  if (!text) {
    logger.warn('TTS request without text');
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const { synthesizeSpeech } = require('../services/windexaiTTSService');
  try {
    logger.info('Calling TTS service...');
    const audioBuffer = await synthesizeSpeech(text, { voice, model });
    
    logger.info('TTS synthesis successful, audio size:', audioBuffer.length);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="speech.mp3"',
      'Content-Length': audioBuffer.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    res.send(audioBuffer);
  } catch (e) {
    logger.error('TTS synthesis failed:', e);
    res.status(500).json({ error: 'TTS synthesis failed', details: e.message });
  }
}));

// Transcription endpoint (WindexAI Whisper)
router.post('/transcribe', upload.single('audio'), ErrorHandler.asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'audio file is required' });
    }

    const tempDir = path.join(__dirname, '../uploads/audio');
    await fsp.mkdir(tempDir, { recursive: true });
    // Сохраняем с исходным расширением, по умолчанию webm
    const extension = (req.file.originalname && path.extname(req.file.originalname)) || '.webm';
    const tempPath = path.join(tempDir, `recording_${Date.now()}${extension}`);
    await fsp.writeFile(tempPath, req.file.buffer);

    const WindexAI = require('openai'); // WindexAI API client
    const windexai = new WindexAI({ apiKey: process.env.WINDEXAI_API_KEY });

    const fileStream = fs.createReadStream(tempPath);
    let transcriptText = '';
    const preferredModel = process.env.WINDEXAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';
    try {
      // Пытаемся сначала актуальной моделью
      const tr1 = await windexai.audio.transcriptions.create({ file: fileStream, model: preferredModel });
      transcriptText = tr1?.text || '';
    } catch (primaryError) {
      logger.warn('Primary transcription failed, trying whisper-1', { error: primaryError.message });
      try {
        // Повторная попытка через whisper-1
        const fallbackStream = fs.createReadStream(tempPath);
        const tr2 = await windexai.audio.transcriptions.create({ file: fallbackStream, model: 'whisper-1' });
        transcriptText = tr2?.text || '';
      } catch (fallbackError) {
        logger.error('Both transcription attempts failed', { error: fallbackError.message });
        transcriptText = '';
      }
    } finally {
      // Чистим временный файл
      try { await fsp.unlink(tempPath); } catch (_) {}
    }

    // Возвращаем 200 даже при пустой расшифровке, чтобы UI не падал
    return res.json({ text: transcriptText });
  } catch (error) {
    logger.error('Transcription error:', error);
    // Возвращаем 200 с пустым текстом, чтобы на фронте не возникал 500
    return res.json({ text: '' });
  }
}));

// Generate DOCX from AI content
router.post('/generate-docx', ErrorHandler.asyncHandler(async (req, res) => {
  const { title = 'Документ', content = '' } = req.body || {};
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }

  // Helpers
  const sanitize = (str = '') => String(str).replace(/\r\n/g, '\n');

  const parseInline = (text) => {
    // Very simple inline markdown parser for **bold**, _italic_
    const runs = [];
    let remaining = text;
    const regex = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
      }
      const token = match[0];
      if (token.startsWith('**')) {
        runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
      } else if (token.startsWith('_')) {
        runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
      } else if (token.startsWith('*')) {
        runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
      } else if (token.startsWith('`')) {
        // Без смены шрифта, чтобы сохранялась единообразие
        runs.push(new TextRun({ text: token.slice(1, -1) }));
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
      runs.push(new TextRun({ text: text.slice(lastIndex) }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text })];
  };

  const makeParagraph = (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return new Paragraph({ children: [new TextRun({ text: '' })] });
    }
    // Horizontal rule
    if (/^\s*-{3,}\s*$/.test(trimmed)) {
      return new Paragraph({
        border: {
          bottom: { color: '999999', space: 1, value: BorderStyle.SINGLE, size: 6 }
        }
      });
    }
    // Bullet list
    const ulMatch = /^\s*[-•]\s+(.+)$/.exec(line);
    if (ulMatch) {
      return new Paragraph({ children: parseInline(ulMatch[1]), bullet: { level: 0 } });
    }
    // Numbered list (render as plain paragraph with bold number)
    const olMatch = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    if (olMatch) {
      return new Paragraph({
        children: [new TextRun({ text: `${olMatch[1]}. `, bold: true }), ...parseInline(olMatch[2])]
      });
    }
    // Centered bold line if wrapped in ** ** entirely
    if (/^\*\*[^]+\*\*$/.test(trimmed)) {
      const inner = trimmed.slice(2, -2);
      return new Paragraph({
        children: [new TextRun({ text: inner, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      });
    }
    // Italic-only line wrapped in _ _
    if (/^_[^]+_$/.test(trimmed)) {
      const inner = trimmed.slice(1, -1);
      return new Paragraph({ children: [new TextRun({ text: inner, italics: true })], spacing: { after: 120 } });
    }
    // Default paragraph
    return new Paragraph({ children: parseInline(line), spacing: { after: 120 } });
  };

  const lines = sanitize(content).split('\n');
  const children = [];
  // Title
  const titleText = String(title || 'Документ').trim();
  children.push(new Paragraph({
    text: titleText,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 }
  }));
  // Body
  for (const line of lines) {
    children.push(makeParagraph(line));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 24 }, // 12pt
          paragraph: { spacing: { after: 120 } }
        },
        heading1: {
          run: { font: 'Times New Roman', size: 32, bold: true }, // 16pt
          paragraph: { spacing: { after: 240 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 } // 1 inch margins
          }
        },
        children
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const rawTitle = String(title || 'document');
  // Удаляем переводы строк и запрещенные символы для имени файла
  const cleanedTitle = rawTitle
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/[^\w\u0400-\u04FF\-\s]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'document';
  const asciiTitle = cleanedTitle.replace(/[^\x20-\x7E]+/g, '_') || 'document';
  const disposition = `attachment; filename="${asciiTitle}.docx"; filename*=UTF-8''${encodeURIComponent(cleanedTitle)}.docx`;
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': disposition,
    'Content-Length': buffer.length
  });
  res.send(buffer);
}));

// Voice chat endpoint
router.post('/chat/voice', ErrorHandler.asyncHandler(async (req, res) => {
  try {
    logger.info('Voice message received via JSON');
    
    const { audio, filename } = req.body;
    
    if (!audio) {
      logger.warn('No audio data provided');
      return res.status(400).json({ error: 'Audio data is required' });
    }
    
    // Конвертируем base64 в Buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    logger.info('Processing voice message...', { 
      size: audioBuffer.length,
      filename: filename || 'recording.wav'
    });
    
    // Здесь будет логика обработки аудио и получения ответа
    // Пока возвращаем заглушку
    const transcription = "Голосовое сообщение обработано";
    const response = "Спасибо за ваше голосовое сообщение! Я готов помочь вам с юридическими вопросами.";
    
    logger.info('Generating TTS response...');
    
    // Генерируем аудио ответ
    const { synthesizeSpeech } = require('../services/windexaiTTSService');
    const responseAudioBuffer = await synthesizeSpeech(response, { voice: 'nova', model: 'tts-1' });
    
    logger.info('TTS generated, saving audio file...');
    
    // Сохраняем аудио файл в папку uploads/audio для отображения в списке
    const fs = require('fs');
    const path = require('path');
    const audioFileName = `voice_response_${Date.now()}.mp3`;
    const audioPath = path.join(__dirname, '../uploads/audio', audioFileName);
    
    if (!fs.existsSync(path.dirname(audioPath))) {
      fs.mkdirSync(path.dirname(audioPath), { recursive: true });
    }
    
    fs.writeFileSync(audioPath, responseAudioBuffer);
    
    logger.info('Audio file saved:', audioFileName);
    
    const responseData = {
      transcription,
      response,
      audioUrl: `/api/court/audio-files/${audioFileName}`
    };
    
    logger.info('Sending response:', responseData);
    res.json(responseData);
    
  } catch (error) {
    logger.error('Voice processing error:', error);
    res.status(500).json({ error: 'Voice processing failed', details: error.message });
  }
}));

// Audio file serving endpoint
router.get('/chat/audio/:filename', (req, res) => {
  const { filename } = req.params;
  const path = require('path');
  const audioPath = path.join(__dirname, '../uploads/audio', filename);
  
  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Disposition': 'inline; filename="speech.mp3"',
    'Access-Control-Allow-Origin': '*'
  });
  
  res.sendFile(audioPath, (err) => {
    if (err) {
      logger.error('Audio file serving error:', err);
      res.status(404).json({ error: 'Audio file not found' });
    }
  });
});

// GET /api/knowledge-base - Получение базы знаний
router.get('/knowledge-base', ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // Возвращаем базовую структуру базы знаний
    const knowledgeBase = {
      categories: [
        {
          id: 'civil_law',
          name: 'Гражданское право',
          description: 'Договоры, сделки, имущественные отношения',
          topics: [
            'Договоры купли-продажи',
            'Аренда недвижимости',
            'Наследственное право',
            'Защита прав потребителей'
          ]
        },
        {
          id: 'labor_law',
          name: 'Трудовое право',
          description: 'Трудовые отношения, защита работников',
          topics: [
            'Трудовой договор',
            'Увольнение',
            'Охрана труда',
            'Заработная плата'
          ]
        },
        {
          id: 'family_law',
          name: 'Семейное право',
          description: 'Брак, развод, алименты',
          topics: [
            'Брачный договор',
            'Развод',
            'Алименты',
            'Опека и попечительство'
          ]
        },
        {
          id: 'criminal_law',
          name: 'Уголовное право',
          description: 'Преступления и наказания',
          topics: [
            'Уголовная ответственность',
            'Защита прав обвиняемого',
            'Возмещение ущерба',
            'Амнистия и помилование'
          ]
        }
      ],
      documents: [
        {
          id: 'contract_template',
          name: 'Шаблон договора',
          type: 'contract',
          category: 'civil_law'
        },
        {
          id: 'complaint_template',
          name: 'Шаблон жалобы',
          type: 'complaint',
          category: 'general'
        },
        {
          id: 'application_template',
          name: 'Шаблон заявления',
          type: 'application',
          category: 'general'
        }
      ],
      lastUpdated: new Date().toISOString()
    };
    
    res.json(knowledgeBase);
  } catch (error) {
    logger.error('Error fetching knowledge base:', error);
    res.status(500).json({ error: 'Ошибка при получении базы знаний' });
  }
}));

module.exports = router; 