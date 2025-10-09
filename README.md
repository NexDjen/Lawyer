# 🤖 Windex-Юрист - Интеллектуальная Юридическая Система

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![WindexAI](https://img.shields.io/badge/WindexAI-GPT--4o--mini-purple.svg)](https://windexai.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Полнофункциональная AI-система для автоматизации юридических консультаций, анализа документов и генерации правовых материалов с использованием современных технологий ИИ.

## ✨ Основные возможности

### 🎯 Функциональность
- **ИИ-юрист Галина** - умный помощник с поддержкой WindexAI
- **OCR обработка документов** - распознавание текста из изображений и PDF
- **Генерация юридических документов** - автоматическое создание договоров
- **Голосовые функции** - TTS (Text-to-Speech) и STT (Speech-to-Text)
- **Админ-панель** - мониторинг использования и статистика

### 🔧 Технические возможности
- Распознавание рукописного текста
- Анализ судебных документов
- Генерация юридических заключений
- Многоязычная поддержка
- Веб-интерфейс с современным дизайном

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- npm или yarn
- WindexAI API ключ

### Установка

1. **Клонировать репозиторий:**
   ```bash
   git clone https://github.com/NexDjen/Lawyer.git
   cd Lawyer
   ```

2. **Установить зависимости:**
   ```bash
   # Frontend зависимости
   npm install

   # Backend зависимости
   cd backend
   npm install
   cd ..
   ```

3. **Настроить переменные окружения:**
   ```bash
   cp env.example .env
   # Отредактируйте .env файл и добавьте ваш WINDEXAI_API_KEY
   ```

4. **Запустить проект:**
   ```bash
   # В одном терминале - Frontend (порт 3000)
   npm start

   # В другом терминале - Backend (порт 3007)
   cd backend && npm run dev
   ```

5. **Открыть в браузере:**
   ```
   http://localhost:3000
   ```

## 📁 Структура проекта

```
Windex-Юрист/
├── 📁 backend/           # Node.js сервер
│   ├── 📁 services/      # Бизнес-логика (WindexAI интеграция)
│   ├── 📁 routes/        # API endpoints
│   ├── 📁 controllers/   # Контроллеры
│   └── 📁 data/          # Данные и статистика
├── 📁 src/              # React приложение
│   ├── 📁 components/   # UI компоненты
│   ├── 📁 pages/        # Страницы приложения
│   └── 📁 services/     # Клиентские сервисы
├── 📁 public/           # Статические файлы
├── 📁 uploads/          # Загруженные файлы
└── 📄 *.md              # Документация
```

## 🛠️ Технологии

### Frontend
- **React 18** - современный UI фреймворк
- **CSS Modules** - модульная стилизация
- **Web Audio API** - работа со звуком
- **Speech Synthesis API** - синтез речи

### Backend
- **Node.js + Express** - серверная платформа
- **WindexAI API** - ИИ для чата и генерации
- **Tesseract OCR** - распознавание текста
- **Multer** - обработка файлов
- **Winston** - логирование

### AI & ML
- **WindexAI** - основной ИИ провайдер
- **OpenAI SDK** - совместимость с WindexAI
- **Tesseract** - OCR движок
- **Python интеграция** - расширенная обработка изображений

## 🔧 Конфигурация

### Переменные окружения (.env)
```env
# WindexAI API Configuration
WINDEXAI_API_KEY=your_windexai_api_key_here
WINDEXAI_MODEL=gpt-4o-mini
WINDEXAI_TTS_MODEL=tts-1
WINDEXAI_WHISPER_MODEL=whisper-1

# Server Configuration
PORT=3007
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Получение WindexAI API ключа
1. Перейдите на WINDEX (Добавить URL)
2. Зарегистрируйтесь и получите API ключ
3. Добавьте ключ в файл `.env`

## 📊 API Endpoints

### Основные endpoints
- `POST /chat` - Отправка сообщения ИИ-юристу
- `POST /upload` - Загрузка документа для анализа
- `GET /admin/stats` - Получение статистики использования
- `POST /tts` - Генерация речи из текста

### Админ-панель
- `/admin/stats` - Статистика WindexAI
- `/admin/users` - Управление пользователями
- `/admin/logs` - Просмотр логов

## 🎨 Интерфейс

### Главная страница
- Приветственный экран с возможностями
- Быстрый доступ к основным функциям

### Чат с ИИ-юристом
- Общение с Галиной в реальном времени
- Поддержка голосового ввода
- Автоматическое воспроизведение ответов

### Анализ документов
- Загрузка PDF и изображений
- OCR обработка текста
- Генерация юридических заключений

### Админ-панель
- Мониторинг использования API
- Управление пользователями
- Просмотр статистики

## 🔍 Использование

### Для пользователей
1. Зарегистрируйтесь в системе
2. Выберите нужную функцию (чат, анализ документов, генерация)
3. Следуйте подсказкам интерфейса

### Для разработчиков
1. Изучите [README_DETAILED.md](README_DETAILED.md) для подробной документации
2. Ознакомьтесь с [SETUP.md](SETUP.md) для настройки
3. Изучите API в [CHANGELOG.md](CHANGELOG.md)

## 🐛 Устранение неполадок

### Распространенные проблемы

**Сервер не запускается:**
```bash
# Проверьте установку зависимостей
cd backend && npm install

# Проверьте переменные окружения
cat .env
```

**Ошибка подключения к WindexAI:**
```bash
# Проверьте API ключ
echo $WINDEXAI_API_KEY

# Проверьте подключение
curl -H "Authorization: Bearer $WINDEXAI_API_KEY" https://api.windexai.com/v1/models
```

