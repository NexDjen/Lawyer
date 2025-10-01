# 🔧 Исправление проблем после деплоя

## Найденные проблемы

### 1. ❌ Отсутствует OPENAI_API_KEY

**Проблема:** В `env.example` не было переменной `OPENAI_API_KEY`, хотя она критически необходима для работы:
- OpenAI Vision OCR (распознавание документов)
- OpenAI TTS (синтез речи)

**Решение:** ✅ Добавлена секция в `env.example` и `backend/config/config.js`

### 2. ❌ Отсутствует скрипт server:prod

**Проблема:** В `backend/package.json` не было скрипта `server:prod`, но он использовался в `Dockerfile`

**Решение:** ✅ Добавлен скрипт `"server:prod": "NODE_ENV=production node server.js"`

## Что было исправлено

### ✅ backend/config/config.js
- Добавлена секция `openai` с настройками:
  - apiKey
  - model
  - visionModel
  - ttsModel
  - ttsVoice
- Улучшено логирование при старте сервера

### ✅ env.example
- Добавлена секция OPENAI API CONFIGURATION
- Добавлены переменные:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_VISION_MODEL`
  - `OPENAI_TTS_MODEL`
  - `OPENAI_TTS_VOICE`

### ✅ backend/package.json
- Добавлен скрипт `server:prod` для production запуска

## Что нужно сделать на сервере

### Шаг 1: Обновите код на сервере

```bash
git pull origin main
```

### Шаг 2: Создайте или обновите .env файл

На сервере откройте/создайте файл `.env` и добавьте:

```bash
# WindexAI API (для чата)
WINDEXAI_API_KEY=ваш_windexai_ключ

# OpenAI API (для OCR и TTS)
OPENAI_API_KEY=ваш_openai_ключ
OPENAI_MODEL=gpt-4o
OPENAI_VISION_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy

# Другие настройки
PORT=3007
NODE_ENV=production
```

### Шаг 3: Перезапустите сервисы

**Для Docker:**
```bash
cd /path/to/layer_3
docker-compose down
docker-compose up -d --build
```

**Для PM2:**
```bash
cd /path/to/layer_3/backend
pm2 restart all
```

**Для systemd:**
```bash
systemctl restart ai-lawyer
```

### Шаг 4: Проверьте логи

**Docker:**
```bash
docker-compose logs -f backend
```

**PM2:**
```bash
pm2 logs
```

Вы должны увидеть:
```
🔧 Backend Configuration:
  - Port: 3007
  - Host: 0.0.0.0
  - WindexAI API Key: SET (windex_a...)
  - WindexAI Model: gpt-4o-mini
  - OpenAI API Key: SET (sk-proj-...)
  - OpenAI Vision Model: gpt-4o
  - NODE_ENV: production
```

## Проверка работоспособности

### 1. Health Check
```bash
curl http://localhost:3007/health
```

Ожидаемый ответ:
```json
{
  "status": "OK",
  "timestamp": "2025-10-01T...",
  "version": "1.0.0"
}
```

### 2. Тест OCR (если есть тестовое изображение)
```bash
curl -X POST http://localhost:3007/api/documents/ocr \
  -F "file=@test_image.jpg" \
  -F "documentType=passport"
```

### 3. Проверьте логи на ошибки
```bash
# Не должно быть сообщений "OPENAI_API_KEY is not set"
# Не должно быть ошибок "OpenAI API ключ не настроен"
```

## Важные замечания

1. **Безопасность:** Никогда не коммитьте `.env` файл в Git
2. **Кредиты:** Убедитесь, что у вас достаточно кредитов на OpenAI аккаунте
3. **Стоимость:** `gpt-4o` дороже чем `gpt-4o-mini`, выбирайте разумно
4. **Fallback:** Если OpenAI недоступен, некоторые функции будут работать через Tesseract

## Дополнительная информация

Подробнее об настройке OpenAI API смотрите в файле `OPENAI_SETUP.md`

