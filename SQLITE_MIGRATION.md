# 🗄️ Миграция на SQLite

Данный документ описывает процесс миграции с файлового хранения данных на SQLite базу данных.

## 🎯 Преимущества SQLite

- **Производительность**: Быстрые запросы и операции
- **Надежность**: ACID транзакции и целостность данных
- **Масштабируемость**: Легкое добавление индексов и оптимизация
- **Безопасность**: Хеширование паролей и защита данных
- **Аналитика**: Детальная статистика использования

## 📋 Что изменилось

### ✅ Добавлено
- **SQLite база данных** с полной схемой
- **Модели данных** (User, ChatSession, Document, WindexAIStats)
- **API endpoints** для работы с пользователями
- **Статистика использования** WindexAI
- **Хеширование паролей** с bcrypt
- **Миграционный скрипт** для переноса данных

### 🔄 Обновлено
- **AuthContext** для работы с SQLite API
- **AdminPanel** с новой статистикой
- **ChatService** с записью статистики
- **AdminRoutes** для работы с базой данных

## 🚀 Установка и настройка

### 1. Установка зависимостей

```bash
cd backend
npm install sqlite3 bcrypt
```

### 2. Запуск миграции

```bash
# Запуск скрипта миграции
node scripts/migrate-to-sqlite.js
```

### 3. Проверка работы

```bash
# Запуск сервера
npm run dev
```

## 📊 Структура базы данных

### Таблицы

```sql
-- Пользователи
users (id, name, email, password, role, avatar, phone, address, created_at, updated_at, last_login, is_active)

-- Сессии чата
chat_sessions (id, user_id, title, created_at, updated_at, is_active)

-- Сообщения чата
chat_messages (id, session_id, user_id, type, content, audio_url, document_url, metadata, created_at)

-- Документы
documents (id, user_id, filename, original_name, file_path, file_size, mime_type, document_type, extracted_text, ocr_confidence, analysis_result, created_at, updated_at, is_deleted)

-- OCR результаты
ocr_results (id, document_id, extracted_data, confidence, processing_time, created_at)

-- Аудио файлы
audio_files (id, user_id, filename, file_path, file_size, duration, voice_type, tts_service, created_at, expires_at)

-- Статистика WindexAI
windexai_stats (id, user_id, request_type, model, tokens_used, cost, response_time, created_at)

-- Профили пользователей
user_profiles (id, user_id, personal_data, case_notes, preferences, created_at, updated_at)

-- Системные настройки
system_settings (key, value, description, updated_at)
```

## 🔧 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Авторизация
- `GET /api/auth/me` - Информация о текущем пользователе

### Пользователи
- `GET /api/users/:userId/profile` - Профиль пользователя
- `PUT /api/users/:userId/profile` - Обновление профиля
- `GET /api/users/:userId/stats` - Статистика пользователя
- `PUT /api/users/:userId/personal-data` - Персональные данные
- `POST /api/users/:userId/case-notes` - Добавление заметки
- `GET /api/users/:userId/case-notes` - Получение заметок

### Администрирование
- `GET /api/admin/users` - Список пользователей
- `GET /api/admin/windexai-stats` - Статистика WindexAI
- `GET /api/admin/daily-stats` - Дневная статистика
- `GET /api/admin/database-stats` - Статистика БД
- `POST /api/admin/reset-stats` - Сброс статистики

## 📈 Новая функциональность

### 1. Детальная статистика
- **Использование токенов** по пользователям и дням
- **Стоимость запросов** с прогнозированием расходов
- **Производительность** с метриками времени ответа
- **Аналитика моделей** и типов запросов

### 2. Управление пользователями
- **Роли и права доступа** (user/admin)
- **Профили пользователей** с персональными данными
- **Заметки о делах** для контекстных консультаций
- **Статистика активности** каждого пользователя

### 3. Безопасность
- **Хеширование паролей** с bcrypt
- **Валидация данных** на всех уровнях
- **Защита от SQL-инъекций** через параметризованные запросы
- **Логирование операций** для аудита

## 🔄 Миграция данных

### Автоматическая миграция
Скрипт `migrate-to-sqlite.js` автоматически:
1. Создает структуру базы данных
2. Создает демо-пользователей
3. Добавляет демо-статистику
4. Проверяет целостность данных

### Ручная миграция
Если нужно перенести существующие данные:

```javascript
// Пример миграции пользователей из localStorage
const users = JSON.parse(localStorage.getItem('users') || '[]');
for (const user of users) {
  await User.create({
    name: user.name,
    email: user.email,
    password: user.password, // В реальности нужно хешировать
    role: user.role
  });
}
```

## 🐛 Устранение неполадок

### Проблема: База данных не создается
```bash
# Проверьте права доступа
ls -la backend/data/
# Создайте директорию вручную
mkdir -p backend/data
```

### Проблема: Ошибки миграции
```bash
# Удалите базу данных и запустите заново
rm backend/data/lawyer.db
node scripts/migrate-to-sqlite.js
```

### Проблема: Пользователи не создаются
```bash
# Проверьте логи
tail -f backend/logs/app.log
# Проверьте подключение к БД
node -e "const db = require('./backend/database/database'); console.log('DB connected');"
```

## 📊 Мониторинг

### Статистика базы данных
```bash
# Запуск скрипта статистики
node -e "
const db = require('./backend/database/database');
db.getStats().then(stats => {
  console.log('Database Stats:', stats);
  process.exit(0);
});
"
```

### Проверка целостности
```sql
-- Проверка внешних ключей
PRAGMA foreign_key_check;

-- Проверка индексов
SELECT name FROM sqlite_master WHERE type='index';
```

## 🎉 Результат

После миграции вы получите:

✅ **Надежное хранение данных** с ACID транзакциями  
✅ **Детальную аналитику** использования системы  
✅ **Безопасную аутентификацию** с хешированием паролей  
✅ **Масштабируемую архитектуру** для роста системы  
✅ **Профессиональный уровень** разработки  

---

*Документ создан: 2025-01-15*  
*Версия: 1.0*  
*Статус: Готово к продакшену* 🚀
