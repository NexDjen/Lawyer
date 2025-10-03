# 🚀 Руководство по развертыванию на сервере

## ✅ Проект развернут на сервере

**Адреса сервисов:**
- Backend API: http://37.110.51.35:1041
- Frontend: http://37.110.51.35:1042

**SSH подключение:**
```bash
ssh sve@37.110.51.35 -p 1040
```

## 📋 Выполненные шаги

1. ✅ Подключение к серверу
2. ✅ Клонирование репозитория из GitHub
3. ✅ Установка зависимостей (Node.js v18.20.8, npm 10.8.2)
4. ✅ Настройка переменных окружения
5. ✅ Сборка фронтенда для продакшена
6. ✅ Запуск через PM2 (менеджер процессов)
7. ✅ Конфигурация автозапуска

## 🔧 Управление сервисами

### Проверить статус
```bash
cd /home/sve/ai-lawyer
npx pm2 status
```

### Перезапустить сервисы
```bash
npx pm2 restart all
# или отдельно
npx pm2 restart ai-lawyer-backend
npx pm2 restart ai-lawyer-frontend
```

### Остановить сервисы
```bash
npx pm2 stop all
```

### Запустить сервисы
```bash
npx pm2 start ecosystem.config.js
```

### Просмотр логов
```bash
# Все логи
npx pm2 logs

# Только backend
npx pm2 logs ai-lawyer-backend

# Только frontend
npx pm2 logs ai-lawyer-frontend

# Последние 50 строк
npx pm2 logs --lines 50
```

## ⚠️ Известные проблемы и решения

### Проблема 1: OpenAI API блокируется (403 Country not supported)

**Причина:** OpenAI блокирует запросы из России

**Текущее решение:** Система использует fallback ответы (заранее подготовленные ответы)

**Полное решение:**

Вариант A: Использовать WindexAI API
```bash
# Получите API ключ на https://windexai.com
# Обновите .env:
cd /home/sve/ai-lawyer
nano .env
# Измените WINDEXAI_API_KEY на реальный ключ
npx pm2 restart all
```

Вариант B: Настроить прокси
```bash
# Добавьте в .env:
HTTPS_PROXY=http://your-proxy-server:port
HTTP_PROXY=http://your-proxy-server:port
npx pm2 restart all
```

Вариант C: Использовать VPN на сервере
```bash
# Установите и настройте VPN клиент
# Перезапустите сервисы после подключения VPN
```

### Проблема 2: Порт уже занят

```bash
# Проверить, что использует порт
sudo lsof -i :1041
sudo lsof -i :1042

# Убить процесс
sudo kill -9 PID

# Перезапустить
npx pm2 restart all
```

### Проблема 3: Недостаточно памяти

```bash
# Проверить использование памяти
npx pm2 monit

# Увеличить лимит в ecosystem.config.js
nano ecosystem.config.js
# Измените max_memory_restart: "1G" на "2G"
npx pm2 restart all
```

## 🔄 Обновление кода с GitHub

```bash
cd /home/sve/ai-lawyer

# Остановить сервисы
npx pm2 stop all

# Получить последние изменения
git pull origin main

# Установить новые зависимости (если есть)
npm install
cd backend && npm install && cd ..

# Пересобрать фронтенд
npm run build

# Запустить сервисы
npx pm2 start ecosystem.config.js
```

## 📝 Конфигурационные файлы

### ecosystem.config.js
Конфигурация PM2 для управления процессами

### .env
Переменные окружения:
- `PORT=1041` - порт backend
- `WINDEXAI_API_KEY` - API ключ для чата
- `OPENAI_API_KEY` - API ключ для OCR и TTS
- `NODE_ENV=production` - режим работы

## 🌐 Доступные порты

- 1041 - Backend API
- 1042 - Frontend (текущий)
- 1043-1049 - Резервные порты

## 📊 Мониторинг

```bash
# Статус всех процессов
npx pm2 status

# Детальный мониторинг (CPU, память)
npx pm2 monit

# Информация о процессе
npx pm2 show ai-lawyer-backend
```

## 🔐 Безопасность

1. **Никогда не коммитьте .env файл** в Git
2. Регулярно обновляйте зависимости: `npm audit fix`
3. Используйте firewall для ограничения доступа к портам
4. Регулярно меняйте SSH пароли

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `npx pm2 logs`
2. Проверьте статус: `npx pm2 status`
3. Проверьте .env файл
4. Перезапустите сервисы: `npx pm2 restart all`

