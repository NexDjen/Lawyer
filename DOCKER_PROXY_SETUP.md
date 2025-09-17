# Настройка прокси для Docker контейнера

## Проблема
WindexAI API возвращает ошибку `403 Country, region, or territory not supported` из-за географических ограничений.

## Решение
Добавить переменные прокси в Docker Compose файл.

## Шаги

### 1. Обновите docker-compose.yml
Добавьте переменные прокси в секцию `environment` для backend сервиса:

```yaml
services:
  backend:
    # ... другие настройки
    environment:
      - NODE_ENV=production
      - PORT=80
      - HOST=0.0.0.0
      - WINDEXAI_API_KEY=your_api_key_here
      - WINDEXAI_MODEL=gpt-4o-mini
      - HTTP_PROXY=http://your-proxy-server:port
      - HTTPS_PROXY=http://your-proxy-server:port
      - NO_PROXY=localhost,127.0.0.1
```

### 2. Или создайте .env файл
Создайте файл `.env` в корне проекта:

```env
HTTP_PROXY=http://your-proxy-server:port
HTTPS_PROXY=http://your-proxy-server:port
NO_PROXY=localhost,127.0.0.1
```

### 3. Перезапустите контейнер
```bash
sudo docker-compose down
sudo docker-compose up -d
```

### 4. Проверьте логи
```bash
sudo docker logs sve-backend-1
```

Должны увидеть:
```
🔧 ChatService initialization {"hasProxy":true,"proxyUrl":"http://***@proxy:port","hasApiKey":true}
```

## Проверка работы
После настройки прокси API должен работать без ошибки 403.

## Примечания
- Замените `your-proxy-server:port` на реальный адрес прокси
- Если прокси требует аутентификации, используйте формат: `http://username:password@proxy:port`
- Переменная `NO_PROXY` исключает локальные адреса из прокси
