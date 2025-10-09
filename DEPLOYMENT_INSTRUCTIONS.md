# 🚀 Инструкция по развертыванию оптимизированной версии

## ✅ Реализованные оптимизации

### 1. **Асинхронная TTS генерация** ⚡
- **Эффект**: x3-5 ускорение ответов
- **Изменено**: `backend/controllers/chatController.js`
- **Результат**: Ответ отправляется сразу, TTS генерируется в фоне

### 2. **Пул HTTP соединений** 🔗
- **Эффект**: -10-20% latency
- **Изменено**: `backend/services/chatService.js`
- **Результат**: 
  - `keepAlive: true`
  - `maxSockets: 50`
  - `maxFreeSockets: 10`

### 3. **Rate Limiting** 🚦
- **Эффект**: Защита от перегрузки
- **Добавлено**: `backend/middleware/rateLimiter.js`
- **Изменено**: `backend/routes/chatRoutes.js`
- **Лимиты**:
  - Chat: 10 запросов/минуту на IP/userId
  - API: 100 запросов/минуту

### 4. **Горизонтальное масштабирование** 📈
- **Эффект**: x3 увеличение RPS
- **Изменено**: `docker-compose.yml`
- **Результат**: 3 инстанса backend (порты 3007, 3008, 3009)

### 5. **Nginx Load Balancer** ⚖️
- **Эффект**: Балансировка нагрузки между инстансами
- **Алгоритм**: least_conn (наименьшее количество активных соединений)

---

## 📦 Развертывание на сервере

### Шаг 1: Копирование файлов на сервер

```bash
# Копируем все измененные файлы
scp -P 1040 docker-compose.yml sve@37.110.51.35:~/ai-lawyer/
scp -P 1040 backend/controllers/chatController.js sve@37.110.51.35:~/ai-lawyer/backend/controllers/
scp -P 1040 backend/services/chatService.js sve@37.110.51.35:~/ai-lawyer/backend/services/
scp -P 1040 backend/middleware/rateLimiter.js sve@37.110.51.35:~/ai-lawyer/backend/middleware/
scp -P 1040 backend/routes/chatRoutes.js sve@37.110.51.35:~/ai-lawyer/backend/routes/
```

### Шаг 2: Настройка Nginx Load Balancer

```bash
# Подключаемся к серверу
ssh sve@37.110.51.35 -p 1040

# Создаем upstream конфигурацию
sudo tee /etc/nginx/conf.d/backend_upstream.conf > /dev/null << 'EOF'
upstream backend_pool {
    least_conn;
    
    server 127.0.0.1:3007 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3008 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3009 max_fails=3 fail_timeout=30s;
    
    keepalive 32;
}
EOF

# Обновляем конфигурацию порта 1041
sudo sed -i 's|proxy_pass http://127.0.0.1:3007;|proxy_pass http://backend_pool;|g' /etc/nginx/sites-available/lawyer-1041.conf

# Проверяем и перезагружаем nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Шаг 3: Перезапуск Docker контейнеров

```bash
cd ~/ai-lawyer

# Останавливаем старые контейнеры
docker compose down

# Пересобираем образы с новым кодом
docker compose build

# Запускаем 3 инстанса
docker compose up -d

# Проверяем статус
docker compose ps
```

### Шаг 4: Проверка работоспособности

```bash
# Проверяем что все 3 инстанса работают
curl http://localhost:3007/health
curl http://localhost:3008/health
curl http://localhost:3009/health

# Проверяем load balancer
curl http://localhost:1041/api/chat/status

# Проверяем публичный домен
curl https://lawyer.windexs.ru:1041/api/chat/status
```

---

## 📊 Ожидаемые результаты

| Метрика | До оптимизации | После оптимизации | Улучшение |
|---------|----------------|-------------------|-----------|
| **RPS** | 0.45 | 1.5-2.0 | **x3-4** |
| **Время ответа** | 8-25s | 3-5s | **x3-5** |
| **Одновременные запросы** | 5-10 | 20-50 | **x4-5** |

---

## 🔍 Мониторинг

### Логи Docker
```bash
# Логи всех инстансов
docker compose logs -f

# Логи конкретного инстанса
docker compose logs -f backend-1
docker compose logs -f backend-2
docker compose logs -f backend-3
```

### Nginx статус
```bash
# Проверка upstream статуса
sudo tail -f /var/log/nginx/access.log | grep "backend_pool"
```

### Метрики производительности
```bash
# Текущие соединения
ss -tnp | grep :3007
ss -tnp | grep :3008
ss -tnp | grep :3009

# Процессор и память
docker stats
```

---

## 🐛 Решение проблем

### Проблема: Один из инстансов не запускается
```bash
# Смотрим логи проблемного инстанса
docker compose logs backend-2

# Перезапускаем конкретный инстанс
docker compose restart backend-2
```

### Проблема: Load balancer не работает
```bash
# Проверяем Nginx конфигурацию
sudo nginx -t

# Смотрим Nginx логи
sudo tail -f /var/log/nginx/error.log

# Проверяем upstream
curl -I http://localhost:1041/api/chat/status
```

### Проблема: Rate limiting слишком строгий
```bash
# Редактируем лимиты в backend/middleware/rateLimiter.js
# Меняем max: 10 на нужное значение
# Перезапускаем backend
docker compose restart backend-1 backend-2 backend-3
```

---

## 📈 Дальнейшие улучшения

### Если нужно еще больше производительности:

1. **Увеличить количество инстансов до 5-10**
   - Изменить `docker-compose.yml`
   - Обновить Nginx upstream

2. **Добавить Redis для сессий**
   - Хранить пользовательские данные в Redis
   - Убрать state из памяти приложения

3. **Streaming ответов**
   - Реализовать Server-Sent Events
   - Клиент будет видеть ответ по мере генерации

4. **Мониторинг (Prometheus + Grafana)**
   - Метрики в реальном времени
   - Автоматические алерты

---

*Документ создан: 2025-10-06*
*Версия: 1.0*


