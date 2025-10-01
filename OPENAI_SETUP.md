# 🔧 Инструкция по настройке OpenAI API

## Проблема

После деплоя на сервере OpenAI API не работает из-за отсутствия переменной окружения `OPENAI_API_KEY`.

## Что требуется

В проекте используются **два разных API ключа**:

1. **WINDEXAI_API_KEY** - для чата и основных функций
2. **OPENAI_API_KEY** - для OpenAI Vision OCR (распознавание документов) и TTS (синтез речи)

## Где используется OPENAI_API_KEY

- `openaiOCRService.js` - Распознавание текста с документов через OpenAI Vision
- `openaiTTSService.js` - Синтез речи через OpenAI TTS
- `ocrService.js` - Основной сервис обработки документов
- `documentService.js` - Генерация документов

## Решение

### 1. Получите OpenAI API ключ

Зайдите на https://platform.openai.com/api-keys и создайте новый API ключ.

### 2. Добавьте ключ в .env файл

На сервере откройте файл `.env` и добавьте:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o
OPENAI_VISION_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy
```

### 3. Для Docker деплоя

Если вы используете Docker Compose, убедитесь, что переменная передается в контейнер:

```yaml
environment:
  - OPENAI_API_KEY=${OPENAI_API_KEY}
```

Это уже настроено в `docker-compose.yml`.

### 4. Перезапустите сервер

**Для обычного деплоя:**
```bash
pm2 restart all
# или
systemctl restart ai-lawyer
```

**Для Docker деплоя:**
```bash
docker-compose down
docker-compose up -d
```

## Проверка

После перезапуска проверьте логи сервера. Вы должны увидеть:

```
🔧 Backend Configuration:
  - OpenAI API Key: SET (sk-proj-...)
  - OpenAI Vision Model: gpt-4o
```

## Альтернативные решения

Если вы не хотите использовать OpenAI API:

1. Используйте только WindexAI для всех операций
2. Отключите функции OCR и TTS, которые используют OpenAI
3. Реализуйте fallback на другие сервисы (Tesseract, Google TTS)

## Важные замечания

- **Не коммитьте .env файл в Git** - он содержит секретные ключи
- Используйте `env.example` как шаблон для создания `.env`
- Убедитесь, что у вашего OpenAI аккаунта достаточно кредитов
- Модель `gpt-4o` стоит дороже, чем `gpt-4o-mini` - выбирайте по потребностям

