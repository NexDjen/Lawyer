# AI Lawyer Backend - Архитектура

## 🏗️ Структура проекта

```
backend/
├── config/           # Конфигурация приложения
│   └── config.js     # Централизованная конфигурация
├── controllers/      # Контроллеры (бизнес-логика)
│   ├── chatController.js
│   └── documentController.js
├── middleware/       # Middleware
│   ├── cors.js       # CORS настройки
│   └── errorHandler.js # Обработка ошибок
├── routes/           # Маршруты API
│   ├── chatRoutes.js
│   └── documentRoutes.js
├── services/         # Сервисы (внешние API, бизнес-логика)
│   ├── windexaiService.js
│   ├── webSearchService.js
│   └── documentService.js
├── utils/            # Утилиты
│   └── logger.js     # Система логирования
└── server.js         # Главный файл сервера
```

## 🚀 Запуск

### Разработка
```bash
npm run server:dev
```

### Продакшн
```bash
npm run server:prod
```

### Обычный запуск
```bash
npm run server
```

## 📋 API Endpoints

### Chat API
- `POST /api/chat` - Обработка чат-запросов

### Document API
- `POST /api/generate-pdf` - Генерация DOCX документов
- `GET /api/uploaded-files` - Получение списка файлов
- `GET /api/document-types` - Поддерживаемые типы документов

### System API
- `GET /health` - Проверка состояния сервера
- `GET /` - Информация об API

## ⚙️ Конфигурация

Все настройки находятся в `config/config.js`:

- **Server**: порт, хост
- **WindexAI**: API ключ, модель, токены
- **Web Search**: включение/выключение, таймауты
- **Upload**: размеры файлов, разрешенные типы
- **CORS**: разрешенные домены
- **Logging**: уровни логирования

## 🔧 Архитектурные принципы

### 1. **Разделение ответственности**
- **Controllers**: обработка HTTP запросов
- **Services**: бизнес-логика и внешние API
- **Routes**: определение маршрутов
- **Middleware**: перехватчики запросов

### 2. **Dependency Injection**
Сервисы инжектируются в контроллеры через модули Node.js

### 3. **Error Handling**
Централизованная обработка ошибок через middleware

### 4. **Logging**
Структурированное логирование с разными уровнями

### 5. **Configuration Management**
Централизованная конфигурация через переменные окружения

## 🛠️ Добавление новых функций

### 1. Создать сервис
```javascript
// services/newService.js
class NewService {
  async doSomething() {
    // логика
  }
}
module.exports = new NewService();
```

### 2. Создать контроллер
```javascript
// controllers/newController.js
const newService = require('../services/newService');

class NewController {
  async handleRequest(req, res) {
    const result = await newService.doSomething();
    res.json(result);
  }
}
module.exports = new NewController();
```

### 3. Создать маршруты
```javascript
// routes/newRoutes.js
const router = express.Router();
const newController = require('../controllers/newController');

router.post('/new-endpoint', newController.handleRequest);
module.exports = router;
```

### 4. Добавить в server.js
```javascript
const newRoutes = require('./routes/newRoutes');
this.app.use('/api', newRoutes);
```

## 📊 Мониторинг

### Логирование
- **INFO**: обычные операции
- **WARN**: предупреждения
- **ERROR**: ошибки
- **DEBUG**: отладочная информация

### Health Check
```bash
curl http://localhost:3001/health
```

## 🔒 Безопасность

- CORS настройки
- Валидация входных данных
- Ограничение размера файлов
- Безопасные имена файлов

## 🧪 Тестирование

### Unit тесты
```bash
npm test
```

### API тесты
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
``` 