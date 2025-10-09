# 🤖 Windex-Юрист - Интеллектуальная Юридическая Система

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![WindexAI](https://img.shields.io/badge/WindexAI-GPT--4o--mini-purple.svg)](https://windexai.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Полнофункциональная AI-система для автоматизации юридических консультаций, анализа документов и генерации правовых материалов с использованием современных технологий ИИ.

## 📋 Оглавление

- [🚀 Ключевые Возможности](#-ключевые-возможности)
- [🛠️ Архитектура и Технологии](#️-архитектура-и-технологии)
- [📋 Системные Требования](#-системные-требования)
- [⚡ Быстрая Установка](#-быстрая-установка)
- [🔧 Детальная Конфигурация](#-детальная-конфигурация)
- [🏗️ Архитектура Проекта](#️-архитектура-проекта)
- [🔌 API Документация](#-api-документация)
- [🎯 Руководство Пользователя](#-руководство-пользователя)
- [🔐 Администрирование](#-администрирование)
- [🐛 Устранение Неполадок](#-устранение-неполадок)
- [📝 Разработка и Расширение](#-разработка-и-расширение)

## 🚀 Ключевые Возможности

### 💬 Интеллектуальный Чат-бот
- **AI-Юрист "Галина"** - специализированный ИИ для юридических консультаций
- **Контекстная память** - поддержание истории разговора
- **Многоязычная поддержка** - работа на русском и английском языках
- **Адаптивные ответы** - персонализация под пользователя

### 📄 Работа с Документами
- **OCR Распознавание** - извлечение текста из PDF и изображений
- **Генерация DOCX** - автоматическое создание юридических документов
- **Анализ документов** - ИИ-анализ содержания и рисков
- **Шаблоны документов** - готовые формы для различных ситуаций

### 🎤 Голосовые Функции
- **Text-to-Speech (TTS)** - озвучивание ответов ИИ
- **Speech-to-Text (STT)** - голосовой ввод вопросов
- **WindexAI Whisper** - высокоточная транскрибация
- **Google Cloud TTS** - альтернативный TTS движок

### 👥 Управление Пользователями
- **Регистрация и аутентификация** - безопасная система аккаунтов
- **Ролевая модель** - пользователи, администраторы, юристы
- **История консультаций** - сохранение всех взаимодействий
- **Профиль пользователя** - персональные настройки

### 📊 Админ-панель
- **Статистика использования** - аналитика по запросам и пользователям
- **Управление пользователями** - CRUD операции с аккаунтами
- **Мониторинг WindexAI** - отслеживание расходов и лимитов
- **Системные метрики** - производительность и здоровье системы

## 🛠️ Архитектура и Технологии

### Frontend Stack
```json
{
  "React": "18.2.0",
  "React Router": "6.3.0",
  "CSS Modules": "Модульная стилизация",
  "Axios": "1.4.0 - HTTP клиент",
  "Lucide React": "0.263.1 - Иконки",
  "Web Audio API": "Голосовые функции",
  "Web Speech API": "Распознавание речи"
}
```

### Backend Stack
```json
{
  "Node.js": ">=18.0.0",
  "Express.js": "4.18.2",
  "WindexAI API": "5.10.2 - GPT-4, Whisper, TTS",
  "Google Cloud TTS": "5.0.0 - Альтернативный TTS",
  "Multer": "2.0.1 - Загрузка файлов",
  "Winston": "3.17.0 - Логирование",
  "Sharp": "0.34.3 - Обработка изображений",
  "PDF-lib": "1.0.0 - Работа с PDF",
  "DOCX": "9.5.1 - Генерация документов"
}
```

## 📋 Системные Требования

### Минимальные требования
- **ОС**: macOS 10.15+, Windows 10+, Linux Ubuntu 18.04+
- **Процессор**: Intel Core i3 / AMD Ryzen 3 или эквивалент
- **Оперативная память**: 4 GB RAM
- **Дисковое пространство**: 2 GB свободного места
- **Node.js**: версии 18.0.0 или выше
- **Python**: версии 3.8+ (для OCR функций)

### Рекомендуемые требования
- **ОС**: macOS 12+, Windows 11, Linux Ubuntu 20.04+
- **Процессор**: Intel Core i5 / AMD Ryzen 5 или выше
- **Оперативная память**: 8 GB RAM или больше
- **Дисковое пространство**: 5 GB свободного места

## ⚡ Быстрая Установка

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd layer_3
```

### 2. Установка зависимостей
```bash
# Установка frontend зависимостей
npm install

# Установка backend зависимостей
cd backend
npm install
cd ..
```

### 3. Настройка переменных окружения
Создайте файл `.env` в корневой директории проекта:

```env
# Backend Configuration
PORT=3007
NODE_ENV=development

# WindexAI API Configuration
WINDEXAI_API_KEY=your_windexai_api_key_here
WINDEXAI_MODEL=gpt-4o-mini
WINDEXAI_TTS_MODEL=tts-1
WINDEXAI_WHISPER_MODEL=whisper-1

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3007
REACT_APP_VERSION=0.1.0
```

### 4. Запуск приложения
```bash
# Терминал 1: Запуск backend сервера
cd backend && npm run dev

# Терминал 2: Запуск React приложения
npm start
```

### 5. Проверка работы
Откройте браузер и перейдите по адресам:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3007

## 🔧 Детальная Конфигурация

### Backend Конфигурация

#### `backend/config/config.js`
```javascript
module.exports = {
  port: process.env.PORT || 3007,
  nodeEnv: process.env.NODE_ENV || 'development',

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.TEMPERATURE) || 0.7
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
};
```

### Frontend Конфигурация

#### `src/config/api.js`
```javascript
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3007',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};
```

## 🏗️ Архитектура Проекта

```
layer_3/
├── 📁 backend/                          # Backend приложение
│   ├── 📁 config/                       # Конфигурационные файлы
│   │   └── config.js                    # Основная конфигурация
│   ├── 📁 controllers/                  # Контроллеры API
│   │   ├── chatController.js           # Контроллер чата
│   │   └── documentController.js       # Контроллер документов
│   ├── 📁 middleware/                  # Express middleware
│   │   ├── cors.js                     # CORS настройки
│   │   └── errorHandler.js             # Обработка ошибок
│   ├── 📁 routes/                      # API маршруты
│   │   ├── chatRoutes.js               # Маршруты чата
│   │   ├── documentRoutes.js           # Маршруты документов
│   │   ├── adminRoutes.js              # Админ маршруты
│   │   ├── courtRoutes.js              # Судебные маршруты
│   │   └── walletRoutes.js             # Финансовые маршруты
│   ├── 📁 services/                    # Бизнес-логика
│   │   ├── chatService.js              # Сервис чата
│   │   ├── windexaiService.js          # WindexAI интеграция
│   │   ├── ocrService.js               # OCR сервис
│   │   ├── documentService.js          # Сервис документов
│   │   └── voicePricingService.js      # Сервис ценообразования
│   ├── 📁 data/                        # Данные и статистика
│   │   ├── daily_stats.json            # Дневная статистика
│   │   ├── documents.json              # Данные документов
│   │   └── windexai_stats.json         # Статистика WindexAI
│   ├── 📁 utils/                       # Утилиты
│   │   └── logger.js                   # Логирование
│   ├── 📁 temp/                        # Временные файлы
│   ├── 📁 uploads/                     # Загруженные файлы
│   ├── server.js                       # Главный серверный файл
│   └── package.json                    # Backend зависимости
│
├── 📁 src/                             # Frontend приложение
│   ├── 📁 components/                  # React компоненты
│   │   ├── AdminPanel.js              # Админ-панель
│   │   ├── ChatInput.js               # Поле ввода чата
│   │   ├── DocumentUpload.js          # Загрузка документов
│   │   ├── AudioFilesList.js          # Список аудио файлов
│   │   └── ...
│   ├── 📁 pages/                      # Страницы приложения
│   │   ├── Home.js                    # Главная страница
│   │   ├── Chat.js                    # Страница чата
│   │   ├── Lawyer.js                  # Страница юриста
│   │   ├── Documents.js               # Страница документов
│   │   └── ...
│   ├── 📁 contexts/                   # React контексты
│   │   └── AuthContext.js             # Контекст аутентификации
│   ├── 📁 hooks/                      # Пользовательские хуки
│   │   ├── useChat.js                 # Хук для чата
│   │   └── useWebSocketChat.js        # WebSocket хук
│   ├── 📁 services/                   # API сервисы
│   │   ├── adminService.js            # Админ API
│   │   └── userService.js             # Пользовательский API
│   ├── 📁 utils/                      # Утилиты
│   │   ├── numberUtils.js             # Работа с числами
│   │   ├── dateUtils.js               # Работа с датами
│   │   └── documentUtils.js           # Работа с документами
│   ├── 📁 data/                       # Статические данные
│   │   ├── legalKnowledgeBase.js      # База знаний
│   │   └── translations.js            # Переводы
│   ├── App.js                         # Главный компонент
│   ├── index.js                       # Точка входа
│   └── ...
│
├── 📁 public/                         # Статические файлы
├── 📁 build/                          # Собранное приложение
├── 📁 uploads/                        # Загруженные файлы
├── 📁 temp/                           # Временные файлы
├── 📁 venv/                           # Python виртуальное окружение
├── package.json                       # Frontend зависимости
├── requirements.txt                   # Python зависимости
└── README.md                         # Этот файл
```

## 🔌 API Документация

### Базовый URL
```
http://localhost:3007/api
```

### Аутентификация
Большинство endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <jwt_token>
```

### 📡 Chat API

#### POST `/chat`
Отправка сообщения AI-юристу
```javascript
// Request
{
  "message": "Как составить договор купли-продажи квартиры?",
  "history": [
    {"role": "user", "content": "Привет"},
    {"role": "assistant", "content": "Здравствуйте! Чем могу помочь?"}
  ],
  "voice": true  // Опционально: включить голосовой ответ
}

// Response
{
  "response": "Для составления договора купли-продажи квартиры...",
  "audioUrl": "http://localhost:3007/audio/response_123.mp3",
  "usage": {
    "tokens": 150,
    "cost": 0.003
  }
}
```

#### POST `/chat/transcribe`
Транскрибация аудио файла
```javascript
// Request: multipart/form-data
audio: File (MP3, WAV, M4A, max 25MB)

// Response
{
  "text": "Как составить договор купли-продажи квартиры?",
  "confidence": 0.95,
  "language": "ru"
}
```

#### POST `/chat/generate-docx`
Генерация юридического документа
```javascript
// Request
{
  "template": "contract_sale",
  "data": {
    "seller": "Иванов Иван Иванович",
    "buyer": "Петров Петр Петрович",
    "property": "Квартира по адресу: г. Москва, ул. Ленина, д. 1, кв. 1"
  }
}

// Response
{
  "documentUrl": "http://localhost:3007/documents/contract_123.docx",
  "fileName": "Договор_купли_продажи.docx"
}
```

### 📄 Document API

#### POST `/documents/upload`
Загрузка документа для анализа
```javascript
// Request: multipart/form-data
file: File (PDF, DOCX, JPG, PNG, max 25MB)

// Response
{
  "documentId": "doc_123456",
  "extractedText": "Текст документа...",
  "analysis": {
    "risks": ["Высокий риск: отсутствие подписи"],
    "recommendations": ["Добавить подпись продавца"]
  }
}
```

#### POST `/documents/ocr`
OCR обработка изображения/PDF
```javascript
// Request: multipart/form-data
file: File (PDF, JPG, PNG, max 25MB)
options: {
  "language": "rus+eng",
  "preprocess": true
}

// Response
{
  "text": "Распознанный текст...",
  "confidence": 0.87,
  "processingTime": 2.3
}
```

### 👤 User API

#### POST `/auth/register`
Регистрация нового пользователя
```javascript
// Request
{
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "password": "securePassword123"
}

// Response
{
  "user": {
    "id": "user_123",
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

#### POST `/auth/login`
Вход в систему
```javascript
// Request
{
  "email": "ivan@example.com",
  "password": "securePassword123"
}

// Response
{
  "user": {
    "id": "user_123",
    "name": "Иван Иванов",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

### 🎛️ Admin API

#### GET `/admin/users`
Получение списка пользователей
```javascript
// Response
{
  "users": [
    {
      "id": "user_123",
      "name": "Иван Иванов",
      "email": "ivan@example.com",
      "role": "user",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150
}
```

#### GET `/admin/windexai-stats`
Статистика использования WindexAI
```javascript
// Response
{
  "totalTokens": 125000,
  "totalCost": 25.50,
  "totalRequests": 2500,
  "avgTokensPerRequest": 50,
  "avgCostPerRequest": 0.0102,
  "currentMonth": "2025-01"
}
```

## 🎯 Руководство Пользователя

### 🚀 Быстрый Старт

1. **Регистрация**
   - Перейдите на главную страницу
   - Нажмите "Регистрация"
   - Заполните форму и подтвердите email

2. **Первая Консультация**
   - Перейдите в раздел "Чат с AI"
   - Введите ваш юридический вопрос
   - Получите квалифицированный ответ

3. **Работа с Документами**
   - Перейдите в "Мои документы"
   - Загрузите PDF или изображение
   - Получите анализ и рекомендации

### 💬 Использование Чата

#### Текстовый Режим
- Введите вопрос в поле ввода
- Нажмите Enter или кнопку отправки
- Получите текстовый ответ от AI

#### Голосовой Режим
- Нажмите кнопку микрофона
- Произнесите ваш вопрос
- AI автоматически распознает речь и ответит

#### Генерация Документов
- Во время чата нажмите "СКАЧАТЬ DOCX"
- AI сгенерирует юридический документ
- Скачайте готовый файл

### 📄 Работа с Документами

#### Загрузка Документов
- Выберите файл (PDF, DOCX, JPG, PNG)
- Дождитесь обработки
- Просмотрите извлеченный текст и анализ

#### OCR Обработка
- Загружайте сканы документов
- Система автоматически распознает текст
- Получайте структурированную информацию

## 🔐 Администрирование

### Вход в Админ-панель
```
Email: admin@mail.ru
Пароль: admin123
```

### Управление Системой

#### 👥 Управление Пользователями
- Просмотр списка всех пользователей
- Изменение ролей (user/admin)
- Удаление пользователей
- Просмотр статистики активности

#### 📊 Мониторинг WindexAI
- Общий расход токенов
- Стоимость использования
- Статистика по дням
- Прогноз расходов

#### 📈 Системная Статистика
- Загруженность сервера
- Количество активных пользователей
- Время отклика API
- Статус сервисов

## 🐛 Устранение Неполадок

### 🔴 Критические Ошибки

#### "Cannot access uninitialized variable"
```
Проблема: React хук useCallback имеет неправильные зависимости
Решение:
1. Убедитесь, что все переменные объявлены перед useCallback
2. Проверьте зависимости в массиве useCallback
3. Переместите функции выше useEffect
```

#### "WindexAI API Error"
```
Проблема: Проблемы с WindexAI API
Решение:
1. Проверьте WINDEXAI_API_KEY в .env
2. Убедитесь в достаточном балансе на аккаунте
3. Проверьте лимиты использования
```

#### "CORS Error"
```
Проблема: Cross-Origin Resource Sharing
Решение:
1. Проверьте настройки CORS в backend/config/config.js
2. Убедитесь, что frontend работает на разрешенном порту
3. Проверьте REACT_APP_API_URL
```

### 🟡 Предупреждения

#### "ESLint warnings"
```
Решение:
1. Запустите npm run lint
2. Исправьте все предупреждения
3. Удалите неиспользуемые переменные
4. Добавьте отсутствующие зависимости
```

#### "Port already in use"
```
Решение:
1. Найдите процесс: lsof -i :3007
2. Остановите процесс: kill -9 <PID>
3. Или используйте другой порт: PORT=3008 npm start
```

## 📝 Разработка и Расширение

### 🏗️ Добавление Новых Функций

#### 1. Backend Разработка

**Добавление нового API endpoint:**
```javascript
// backend/routes/newFeatureRoutes.js
const express = require('express');
const router = express.Router();
const newFeatureController = require('../controllers/newFeatureController');

router.get('/new-feature', newFeatureController.getNewFeature);
router.post('/new-feature', newFeatureController.createNewFeature);

module.exports = router;
```

**Регистрация маршрута:**
```javascript
// backend/server.js
const newFeatureRoutes = require('./routes/newFeatureRoutes');
// ...
app.use('/api/new-feature', newFeatureRoutes);
```

#### 2. Frontend Разработка

**Создание нового компонента:**
```javascript
// src/components/NewFeature.js
import React, { useState, useEffect } from 'react';
import './NewFeature.css';

const NewFeature = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchNewFeatureData();
  }, []);

  const fetchNewFeatureData = async () => {
    try {
      const response = await fetch('/api/new-feature');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching new feature data:', error);
    }
  };

  return (
    <div className="new-feature">
      <h2>New Feature</h2>
      {data && <div>{JSON.stringify(data)}</div>}
    </div>
  );
};

export default NewFeature;
```

### 🧪 Тестирование

#### Запуск тестов
```bash
# Backend тесты
cd backend && npm test

# Frontend тесты
npm test

# E2E тесты (если настроены)
npm run test:e2e
```

---

⭐ **Если проект оказался полезным, поставьте звезду на GitHub!**

🚀 **Happy coding with Windex-Юрист!** 🤖⚖️
