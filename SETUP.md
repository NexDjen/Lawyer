# 🚀 Настройка проекта Windex-Юрист

Это руководство поможет вам быстро настроить и запустить проект Windex-Юрист на вашем компьютере.

## 📋 Предварительные требования

### Системные требования
- **Операционная система**: macOS 10.15+, Windows 10+, Linux Ubuntu 18.04+
- **Node.js**: версия 18.0.0 или выше
- **Python**: версия 3.8+ (для OCR функций)
- **Git**: для клонирования репозитория
- **WindexAI API ключ**: с достаточным балансом

### Проверка установки
```bash
# Проверьте версии установленных программ
node --version      # Должно быть >= 18.0.0
npm --version       # Должно быть >= 8.0.0
python3 --version   # Должно быть >= 3.8.0
git --version       # Любая актуальная версия
```

## ⚡ Быстрая настройка

### 1. Клонирование проекта
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
```bash
# Копирование файла конфигурации
cp env.example .env

# Открытие файла для редактирования
nano .env  # или используйте любой текстовый редактор
```

**Заполните следующие обязательные поля в `.env`:**
```env
# Обязательно укажите ваш WindexAI API ключ
WINDEXAI_API_KEY=sk-your-actual-windexai-api-key-here

# Остальные настройки можно оставить по умолчанию
PORT=3007
NODE_ENV=development
REACT_APP_API_URL=http://localhost:3007
```

### 4. Получение WindexAI API ключа

1. Перейдите на [https://windexai.com/api-keys](https://windexai.com/api-keys)
2. Создайте новый API ключ
3. Скопируйте ключ и вставьте в `.env` файл
4. **Важно**: Добавьте средства на баланс WindexAI аккаунта (минимум $5)

### 5. Запуск проекта
```bash
# Терминал 1: Запуск backend сервера
cd backend && npm run dev

# Терминал 2: Запуск React приложения
npm start
```

### 6. Проверка работы
Откройте браузер и перейдите по адресам:
- **Главная страница**: http://localhost:3000
- **Backend API**: http://localhost:3007/api/health

## 🔧 Детальная настройка

### Конфигурация портов
Если стандартные порты заняты, измените их в `.env`:
```env
# Измените порт backend
PORT=3008

# Обновите URL для frontend
REACT_APP_API_URL=http://localhost:3008
```

### Настройка Python для OCR
```bash
# Установка Python зависимостей (если нужно)
pip3 install opencv-python Pillow pytesseract numpy flask flask-cors

# Проверка установки Tesseract OCR
tesseract --version
```

### Настройка базы данных
Проект использует JSON-based хранилище для демо. Для продакшена:

```env
# Для PostgreSQL
DB_TYPE=postgres
DATABASE_URL=postgresql://username:password@localhost:5432/ailawyer

# Для MongoDB
DB_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/ailawyer
```

## 🐛 Устранение проблем

### Проблема: "npm install" не работает
```bash
# Очистка npm кэша
npm cache clean --force

# Повторная установка
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Python не найден"
```bash
# Создание симлинка (Linux/Mac)
sudo ln -s /usr/bin/python3 /usr/bin/python

# Или укажите полный путь в .env
PYTHON_PATH=/usr/bin/python3
```

### Проблема: "Порт уже используется"
```bash
# Найти процесс, использующий порт
lsof -i :3007

# Остановить процесс (замените PID)
kill -9 <PID>

# Или используйте другой порт
PORT=3008 npm run dev
```

### Проблема: "WindexAI API Error"
```bash
# Проверьте:
# 1. Правильность API ключа
# 2. Баланс на WindexAI аккаунте
# 3. Сетевое подключение
# 4. Квоты использования

# Тест API ключа
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.windexai.com/v1/models
```

### Проблема: "CORS Error"
```bash
# Проверьте настройки CORS в backend/config/config.js
# Или добавьте в .env:
CORS_ORIGIN=http://localhost:3000,http://localhost:3008
```

## 🚀 Продвинутая настройка

### Настройка HTTPS (для продакшена)
```bash
# Генерация SSL сертификатов
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Добавьте в .env
SSL_KEY_PATH=./ssl/key.pem
SSL_CERT_PATH=./ssl/cert.pem
HTTPS=true
```

### Настройка логирования
```env
# Уровень логирования
LOG_LEVEL=debug

# Файл логов
LOG_FILE_PATH=./logs/app.log

# Максимальный размер файла логов
LOG_MAX_SIZE=10m

# Количество файлов ротации
LOG_MAX_FILES=5
```

### Настройка кэширования
```env
# Redis для кэширования (опционально)
ENABLE_REDIS=true
REDIS_URL=redis://localhost:6379

# Время жизни кэша
CACHE_TTL=300
```

### Настройка мониторинга
```env
# Sentry для отслеживания ошибок
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Включить APM
ENABLE_APM=true
```

## 🔒 Безопасность

### Перед запуском в продакшен
```bash
# 1. Измените все пароли по умолчанию
ADMIN_PASSWORD=your_secure_password

# 2. Генерируйте новые секретные ключи
JWT_SECRET=your_new_jwt_secret_key

# 3. Настройте HTTPS
HTTPS=true

# 4. Ограничьте CORS
CORS_ORIGIN=https://yourdomain.com

# 5. Включите rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15

# 6. Настройте firewall
# 7. Регулярно обновляйте зависимости
```

## 📊 Мониторинг

### Проверка здоровья системы
```bash
# Health check endpoint
curl http://localhost:3007/api/health

# Статистика WindexAI
curl http://localhost:3007/api/admin/windexai-stats

# Системные метрики
curl http://localhost:3007/api/admin/system-info
```

### Логи
```bash
# Просмотр логов
tail -f ./backend/logs/app.log

# Поиск ошибок
grep "ERROR" ./backend/logs/app.log

# Мониторинг API запросов
grep "POST /api/chat" ./backend/logs/app.log
```

## 🆘 Получение помощи

### Документация
- 📖 **Основная документация**: [README.md](./README.md)
- 📚 **Подробная документация**: [README_DETAILED.md](./README_DETAILED.md)

### Сообщество
- 🐛 **GitHub Issues**: Для багов и предложений
- 💬 **Discord**: [Ссылка на Discord сервер]
- 📧 **Email**: support@ailawyer.com

### Часто задаваемые вопросы (FAQ)

**Q: Можно ли использовать проект без WindexAI API?**
A: Нет, проект полностью зависит от WindexAI API для работы ИИ функций.

**Q: Как уменьшить расходы на WindexAI API?**
A: Используйте модель gpt-4o-mini, настройте меньшее количество токенов, включите кэширование.

**Q: Поддерживает ли проект другие языки кроме русского?**
A: Да, поддерживается многоязычный интерфейс и обработка документов.

**Q: Можно ли интегрировать с другими AI сервисами?**
A: Да, архитектура позволяет добавлять другие провайдеры ИИ.

---

🎉 **Поздравляем!** Проект Windex-Юрист успешно настроен и готов к работе.

Если у вас возникли проблемы, проверьте логи в `./backend/logs/app.log` и обратитесь в раздел [Устранение проблем](#-устранение-проблем) или создайте issue на GitHub.
