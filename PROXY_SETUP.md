# Настройка прокси для WindexAI API

## Проблема
WindexAI API возвращает ошибку `403 Country, region, or territory not supported` из-за географических ограничений.

## Решение
Настроить прокси для Node.js приложения в Docker контейнере.

## 1. Переменные окружения

Добавьте в ваш Docker Compose файл или в .env файл:

```yaml
environment:
  - HTTP_PROXY=http://your-proxy-server:port
  - HTTPS_PROXY=http://your-proxy-server:port
  - NO_PROXY=localhost,127.0.0.1
```

Или в .env файл:
```env
HTTP_PROXY=http://your-proxy-server:port
HTTPS_PROXY=http://your-proxy-server:port
NO_PROXY=localhost,127.0.0.1
```

## 2. Пример для Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - PORT=80
      - HOST=0.0.0.0
      - WINDEXAI_API_KEY=your-api-key
      - HTTP_PROXY=http://your-proxy:port
      - HTTPS_PROXY=http://your-proxy:port
      - NO_PROXY=localhost,127.0.0.1
    ports:
      - "80:80"
```

## 3. Проверка работы прокси

Уже выполнено:
```bash
sudo docker exec sve-backend-1 curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-proj-" \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Привет!"}], "max_tokens": 50}'
```

Результат: ✅ API работает через прокси

## 4. Код уже обновлен

- ✅ Добавлен пакет `https-proxy-agent` в package.json
- ✅ Обновлен ChatService для использования прокси
- ✅ Добавлено логирование прокси настроек

## 5. Следующие шаги

1. Добавьте переменные прокси в ваш Docker конфигурацию
2. Перезапустите контейнер
3. Проверьте логи - должно появиться сообщение о прокси

## 6. Проверка в логах

После перезапуска в логах должно появиться:
```
info: 🔧 ChatService initialization {"hasProxy":true,"proxyUrl":"http://***@your-proxy:port","hasApiKey":true}
```

## 7. Альтернативные решения

Если прокси не помогает:
1. Использовать VPN на сервере
2. Переключиться на другой AI API (Anthropic Claude, Google Gemini)
3. Использовать прокси-сервис с поддержкой нужных регионов
