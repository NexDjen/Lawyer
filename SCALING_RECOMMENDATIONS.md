# 🚀 Рекомендации по масштабированию Chat API

## 📊 Текущее состояние
- **Пропускная способность**: ~0.45 RPS (requests per second)
- **Среднее время ответа**: 5-8 секунд
- **Максимальная нагрузка**: 5-10 одновременных запросов
- **Узкие места**: 
  1. WindexAI API (внешний сервис) - ~3-5s
  2. OpenAI TTS генерация - ~10-15s (блокирует ответ)
  3. Однопоточность Node.js

---

## 🎯 Решения для увеличения производительности

### **1. Асинхронная TTS генерация** ⚡
**Эффект**: x3-5 ускорение ответа

**Текущая проблема**:
```javascript
// ❌ TTS блокирует ответ клиенту
const response = await chatService.processMessage(...);
const audioBuffer = await synthesizeSpeech(response); // 10-15s блокировка
res.json({ response, audioUrl });
```

**Решение**:
```javascript
// ✅ Немедленный ответ + фоновая генерация TTS
const response = await chatService.processMessage(...);
const audioUrl = `/api/audio/chat_${timestamp}.mp3`;

res.json({ response, audioUrl }); // Сразу отправляем ответ

// TTS генерируется в фоне
setImmediate(async () => {
  const audioBuffer = await synthesizeSpeech(response);
  fs.writeFileSync(audioPath, audioBuffer);
});
```

**Результат**: время ответа снизится с 8-25s до 3-5s

---

### **2. Горизонтальное масштабирование** 📈
**Эффект**: линейное увеличение RPS

**Вариант A: Несколько backend инстансов**
```yaml
# docker-compose.yml
services:
  backend-1:
    build: ./backend
    ports: ["3007:3007"]
  backend-2:
    build: ./backend
    ports: ["3008:3007"]
  backend-3:
    build: ./backend
    ports: ["3009:3007"]
```

**Nginx load balancer**:
```nginx
upstream backend_pool {
    least_conn; # Наименьшее количество активных соединений
    server 127.0.0.1:3007;
    server 127.0.0.1:3008;
    server 127.0.0.1:3009;
}

location /api/ {
    proxy_pass http://backend_pool;
}
```

**Результат**: 0.45 RPS → 1.35 RPS (3 инстанса)

---

### **3. Кэширование ответов** 💾
**Эффект**: x100+ для повторяющихся вопросов

```javascript
const redis = require('redis');
const cache = redis.createClient();

async function getCachedOrGenerate(message, userId) {
  const cacheKey = `chat:${userId}:${hashMessage(message)}`;
  
  // Проверяем кэш
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Генерируем новый ответ
  const response = await chatService.processMessage(message);
  
  // Кэшируем на 1 час
  await cache.setex(cacheKey, 3600, JSON.stringify(response));
  
  return response;
}
```

**Результат**: Популярные вопросы отвечают за <100ms

---

### **4. Пул соединений для WindexAI** 🔗
**Эффект**: Снижение latency на 10-20%

```javascript
const { Agent } = require('https');

const httpAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10
});

const windexai = new OpenAI({
  apiKey: process.env.WINDEXAI_API_KEY,
  httpAgent,
  timeout: 30000
});
```

---

### **5. Rate Limiting на уровне пользователя** 🚦
**Эффект**: Защита от перегрузки

```javascript
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 10, // 10 запросов в минуту на IP
  message: 'Слишком много запросов, попробуйте через минуту'
});

router.post('/api/chat', chatLimiter, chatController.handleChatMessage);
```

---

### **6. Streaming ответов** 🌊
**Эффект**: Улучшение perceived performance

```javascript
async function streamResponse(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const stream = await chatService.streamMessage(message);
  
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  
  res.end();
}
```

**Результат**: Пользователь видит ответ по мере генерации

---

### **7. Оптимизация промта** ✂️
**Эффект**: Снижение времени обработки на 20-30%

**Текущий промт**: ~1000-1500 токенов  
**Оптимизированный промт**: ~500-700 токенов

```javascript
// Сокращаем базовый промт
const basePrompt = `Ты — Галина, юрист-стратег с 20+ лет опыта.
Давай точные, юридически выверенные ответы.`;

// Добавляем контекст только когда нужно
if (requiresDetailedContext) {
  prompt += detailedInstructions;
}
```

---

### **8. Мониторинг и автомасштабирование** 📊

```javascript
// Метрики производительности
const prometheus = require('prom-client');

const chatDuration = new prometheus.Histogram({
  name: 'chat_response_duration_seconds',
  help: 'Chat response duration in seconds'
});

const chatRequests = new prometheus.Counter({
  name: 'chat_requests_total',
  help: 'Total number of chat requests'
});
```

---

## 📈 Ожидаемые результаты

| Оптимизация | Текущий RPS | После оптимизации | Улучшение |
|-------------|-------------|-------------------|-----------|
| **Асинхронная TTS** | 0.45 | 1.5-2.0 | x3-4 |
| **+ 3 инстанса** | 2.0 | 6.0 | x3 |
| **+ Кэширование** | 6.0 | 50+ (для кэша) | x8+ |
| **+ Пул соединений** | 6.0 | 7.2 | x1.2 |

**Итого**: С минимальными изменениями можно достичь **20-50 одновременных Chat запросов**.

---

## 🛠 План внедрения (приоритет)

### **Фаза 1: Быстрые победы (1-2 часа)**
1. ✅ Асинхронная TTS генерация
2. ✅ Rate limiting
3. ✅ Пул HTTP соединений

### **Фаза 2: Средние изменения (1 день)**
4. ⬜ Горизонтальное масштабирование (2-3 инстанса)
5. ⬜ Nginx load balancer
6. ⬜ Мониторинг метрик

### **Фаза 3: Продвинутые (2-3 дня)**
7. ⬜ Redis кэширование
8. ⬜ Streaming ответов
9. ⬜ Автомасштабирование

---

## 💡 Рекомендация

**Начните с Фазы 1** - это даст x3-4 улучшение с минимальными изменениями кода.

Для production нагрузки >100 RPS потребуется полный стек оптимизаций + dedicated сервера для каждого компонента.

---

*Документ создан: 2025-10-06*
*Автор: AI DevOps Assistant*


