# 🚀 Инструкция по развертыванию на сервере

## 📋 Информация о сервере

**SSH подключение:**
```bash
ssh sve@37.37.146.116 -p 1040
```
**Пароль:** `640509040147`

**Доступные порты:** 1041-1049  
**Домен:** lawyer.windexs.ru  
**Порт сервиса:** 1041

⚠️ **ВАЖНО:** IP-адрес "377.37.146.116" некорректен (октет не может быть > 255).  
В скриптах используется **37.37.146.116**. Если IP другой - отредактируйте `deploy.sh`

---

## 🎯 Быстрое развертывание

### Вариант 1: Автоматическое развертывание (рекомендуется)

```bash
# На вашем локальном компьютере
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
1. ✅ Создаст архив проекта
2. ✅ Загрузит на сервер
3. ✅ Распакует и настроит
4. ✅ Создаст .env файл
5. ✅ Запустит Docker контейнеры
6. ✅ Проверит работоспособность

### Вариант 2: Ручное развертывание

#### Шаг 1: Создать архив проекта
```bash
tar --exclude='node_modules' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='temp' \
    --exclude='uploads' \
    --exclude='venv' \
    --exclude='.env*' \
    --exclude='*.tar.gz' \
    -czf deploy.tar.gz \
    backend/ src/ public/ docker-compose.yml \
    Dockerfile.frontend package.json package-lock.json env.example
```

#### Шаг 2: Загрузить на сервер
```bash
scp -P 1040 deploy.tar.gz sve@37.37.146.116:~/
```

#### Шаг 3: Подключиться к серверу и распаковать
```bash
ssh sve@37.37.146.116 -p 1040
mkdir -p ~/ai-lawyer
cd ~/ai-lawyer
tar -xzf ~/deploy.tar.gz
rm ~/deploy.tar.gz
```

#### Шаг 4: Создать .env файл
```bash
cd ~/ai-lawyer
nano .env
```

Содержимое .env:
```env
PORT=3007
NODE_ENV=production

# WindexAI API
WINDEXAI_API_KEY=your_api_key_here
WINDEXAI_MODEL=gpt-4o-mini
WINDEXAI_MAX_TOKENS=2000
WINDEXAI_TEMPERATURE=0.7

# OpenAI API
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_VISION_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1

# Security
JWT_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=https://lawyer.windexs.ru,https://lawyer.windexs.ru:1041

# Admin
ADMIN_EMAIL=admin@lawyer.windexs.ru
ADMIN_PASSWORD=secure_password_here
```

#### Шаг 5: Собрать фронтенд
```bash
# На сервере
cd ~/ai-lawyer
npm install
npm run build
```

#### Шаг 6: Запустить Docker контейнеры
```bash
cd ~/ai-lawyer
docker compose down
docker compose build
docker compose up -d
docker compose ps
```

---

## 🌐 Настройка Nginx

### Автоматическая настройка
```bash
# На сервере
chmod +x setup-nginx.sh
./setup-nginx.sh
```

### Ручная настройка

#### 1. Создать upstream конфигурацию
```bash
sudo nano /etc/nginx/conf.d/lawyer-upstream.conf
```

Содержимое:
```nginx
upstream lawyer_backend {
    least_conn;
    server 127.0.0.1:3007 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3008 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3009 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

#### 2. Создать конфигурацию сайта
```bash
sudo nano /etc/nginx/sites-available/lawyer-1041.conf
```

Содержимое:
```nginx
server {
    listen 1041;
    server_name lawyer.windexs.ru;
    
    client_max_body_size 50M;
    
    location /api/ {
        proxy_pass http://lawyer_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Connection "";
    }
    
    location / {
        root /home/sve/ai-lawyer/build;
        try_files $uri /index.html;
    }
}
```

#### 3. Активировать конфигурацию
```bash
sudo ln -s /etc/nginx/sites-available/lawyer-1041.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Проверка работоспособности

```bash
# На сервере
# Проверка backend инстансов
curl http://localhost:3007/api/chat/status
curl http://localhost:3008/api/chat/status
curl http://localhost:3009/api/chat/status

# Проверка через Nginx
curl http://localhost:1041/health
curl http://localhost:1041/api/chat/status

# Проверка Docker контейнеров
docker compose ps
docker compose logs -f
```

**Публичный доступ:**
- Frontend: http://lawyer.windexs.ru:1041
- API: http://lawyer.windexs.ru:1041/api

---

## 🔧 Управление сервисом

### Просмотр логов
```bash
# Docker logs
docker compose logs -f
docker compose logs -f backend-1

# Nginx logs
sudo tail -f /var/log/nginx/lawyer-access.log
sudo tail -f /var/log/nginx/lawyer-error.log
```

### Перезапуск
```bash
# Перезапуск всех контейнеров
docker compose restart

# Перезапуск одного инстанса
docker compose restart backend-1

# Перезапуск Nginx
sudo systemctl reload nginx
```

### Остановка
```bash
docker compose down
```

### Обновление кода
```bash
# Загрузить новый архив
scp -P 1040 deploy.tar.gz sve@37.37.146.116:~/

# На сервере
cd ~/ai-lawyer
docker compose down
tar -xzf ~/deploy.tar.gz
npm run build
docker compose build
docker compose up -d
```

---

## 📊 Мониторинг производительности

```bash
# Статус контейнеров
docker stats

# Сетевые подключения
ss -tnp | grep :3007
ss -tnp | grep :1041

# Использование ресурсов
htop
```

---

## 🐛 Решение проблем

### Проблема: Контейнер не запускается
```bash
docker compose logs backend-1
docker compose restart backend-1
```

### Проблема: API недоступен
```bash
# Проверить порты
sudo lsof -i :3007
sudo lsof -i :1041

# Проверить Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Проблема: Нехватка памяти
```bash
# Проверить память
free -h
docker stats

# Уменьшить количество инстансов в docker-compose.yml
```

---

## 📁 Структура на сервере

```
/home/sve/ai-lawyer/
├── backend/              # Backend код
├── src/                  # Frontend код  
├── build/               # Собранный frontend
├── docker-compose.yml   # Docker конфигурация
├── .env                 # Переменные окружения
├── deploy.sh           # Скрипт развертывания
└── setup-nginx.sh      # Скрипт настройки Nginx
```

---

## 🔐 Безопасность

1. **Изменить пароли:**
   - SSH пароль пользователя
   - ADMIN_PASSWORD в .env
   - JWT_SECRET в .env

2. **Настроить firewall:**
```bash
sudo ufw allow 1041/tcp
sudo ufw allow 1040/tcp
sudo ufw enable
```

3. **Настроить SSL (опционально):**
```bash
sudo certbot --nginx -d lawyer.windexs.ru
```

---

## 📞 Поддержка

При проблемах:
1. Проверьте логи: `docker compose logs -f`
2. Проверьте статус: `docker compose ps`
3. Проверьте Nginx: `sudo nginx -t`
4. Проверьте .env файл

**Документация:**
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx](https://nginx.org/ru/docs/)
- [PM2](https://pm2.keymetrics.io/)

---

*Создано: 13 октября 2025*

