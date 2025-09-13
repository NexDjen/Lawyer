# Google TTS Integration - Улучшенная версия

## Обзор

Интеграция Google Text-to-Speech с улучшениями из проекта `avatar_google_cloud-main`. Включает поддержку SSML, случайных голосов, контроля интонации и стриминга.

## Возможности

### 1. Стандартный синтез
```javascript
POST /api/tts/synthesize
{
  "text": "Текст для синтеза",
  "voiceName": "ru-RU-Chirp3-HD-Orus",
  "languageCode": "ru-RU",
  "audioEncoding": "MP3"
}
```

### 2. Синтез с SSML (контроль интонации)
```javascript
POST /api/tts/ssml
{
  "text": "Текст для синтеза",
  "voiceName": "ru-RU-Chirp3-HD-Orus",
  "rate": "medium",     // slow, medium, fast
  "pitch": "medium",    // low, medium, high
  "volume": "medium"    // silent, x-soft, soft, medium, loud, x-loud
}
```

### 3. Случайный голос
```javascript
POST /api/tts/random
{
  "text": "Текст для синтеза",
  "languageCode": "ru-RU"
}
```

### 4. Стриминг
```javascript
POST /api/tts/stream
{
  "text": "Текст для синтеза",
  "voiceName": "ru-RU-Chirp3-HD-Orus"
}
```

### 5. Интеграция с чатом
```javascript
POST /api/chat/chat
{
  "message": "Вопрос пользователя",
  "synthesizeSpeech": true,
  "voiceName": "ru-RU-Chirp3-HD-Orus",
  "useRandomVoice": false,
  "useSSML": false,
  "ttsOptions": {
    "rate": "medium",
    "pitch": "medium",
    "volume": "medium"
  }
}
```

## Доступные голоса

### Основные голоса
- `ru-RU-Chirp3-HD-Orus` - Высококачественный женский голос (по умолчанию)
- `ru-RU-Standard-A` - Стандартный женский голос
- `ru-RU-Standard-B` - Стандартный мужской голос
- `ru-RU-Standard-C` - Альтернативный голос

### Wavenet голоса (более естественные)
- `ru-RU-Wavenet-A` - Wavenet женский голос
- `ru-RU-Wavenet-B` - Wavenet мужской голос
- `ru-RU-Wavenet-C` - Wavenet альтернативный голос
- `ru-RU-Wavenet-D` - Wavenet дополнительный голос

## API Endpoints

### TTS Endpoints
- `GET /api/tts/voices` - Получение доступных голосов
- `GET /api/tts/voice-info?voiceName=...` - Информация о конкретном голосе
- `GET /api/tts/status` - Статус TTS сервиса
- `POST /api/tts/synthesize` - Стандартный синтез
- `POST /api/tts/stream` - Стриминг синтеза
- `POST /api/tts/ssml` - SSML синтез
- `POST /api/tts/random` - Случайный голос
- `POST /api/tts/chat` - Синтез для чата

### Chat Endpoints с TTS
- `GET /api/chat/tts-options` - Получение TTS опций
- `POST /api/chat/chat` - Чат с TTS интеграцией

## Конфигурация

### Переменные окружения
```bash
GOOGLE_APPLICATION_CREDENTIALS=./google_credentials.json
GOOGLE_TTS_VOICE=ru-RU-Chirp3-HD-Orus
```

### Настройки аудио
- **Sample Rate**: 24000 Hz (как в avatar_google)
- **Audio Encoding**: MP3 для стандартного синтеза, LINEAR16 для стриминга
- **Effects Profile**: headphone-class-device

## Особенности реализации

### 1. Оптимизация текста
- Удаление специальных символов
- Правильные пробелы после знаков препинания
- Очистка от лишних пробелов

### 2. SSML поддержка
- Контроль скорости речи (rate)
- Контроль тона (pitch)
- Контроль громкости (volume)
- Автоматическое экранирование специальных символов

### 3. Случайные голоса
- Автоматический выбор из доступных голосов
- Разнообразие в ответах AI юриста

### 4. Интеграция с чатом
- Автоматический синтез ответов
- Настройка голоса для каждого запроса
- Информация о использованном голосе в ответе

## Примеры использования

### Простой синтез
```javascript
const response = await fetch('/api/tts/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Здравствуйте! Я ваш AI юрист.',
    voiceName: 'ru-RU-Chirp3-HD-Orus'
  })
});
```

### SSML синтез с контролем интонации
```javascript
const response = await fetch('/api/tts/ssml', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Это важная информация!',
    voiceName: 'ru-RU-Chirp3-HD-Orus',
    rate: 'slow',
    pitch: 'high',
    volume: 'loud'
  })
});
```

### Чат с TTS
```javascript
const response = await fetch('/api/chat/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Расскажите о договоре купли-продажи',
    synthesizeSpeech: true,
    useSSML: true,
    ttsOptions: {
      rate: 'medium',
      pitch: 'medium',
      volume: 'medium'
    }
  })
});
```

## Обработка ошибок

### Типичные ошибки
- `401` - Проблемы с Google Cloud credentials
- `400` - Неверные параметры запроса
- `503` - TTS сервис недоступен
- `500` - Внутренняя ошибка сервера

### Логирование
Все TTS операции логируются с информацией о:
- Длине текста
- Использованном голосе
- Методе синтеза
- Размере аудио контента

## Производительность

### Оптимизации
- Кэширование доступных голосов
- Оптимизация текста перед синтезом
- Эффективная обработка SSML
- Стриминг для больших текстов

### Ограничения
- Максимальная длина текста: 5000 символов
- Таймаут синтеза: 60 секунд
- Частота запросов: до 100 запросов в минуту

## Безопасность

### Валидация
- Проверка длины текста
- Валидация параметров голоса
- Экранирование SSML символов
- Проверка доступности голосов

### Аутентификация
- Google Cloud credentials
- Проверка доступа к TTS API
- Логирование всех операций 