# 🔧 Настройка прокси для OpenAI API

## Проблема

OpenAI API блокирует запросы из России (ошибка `403 Country, region, or territory not supported`).

## Решение

Для работы OpenAI API в России нужно использовать прокси или VPN.

## Вариант 1: HTTP/HTTPS Прокси

### 1. Получить прокси

Варианты получения прокси:
- Купить приватный прокси (Например: ProxyLine, Proxy6, SmartProxy)
- Использовать VPN с HTTP прокси функцией
- Развернуть свой прокси-сервер за границей

### 2. Настроить на сервере

Добавьте в `/home/sve/ai-lawyer/.env`:

```bash
# HTTP/HTTPS Proxy для обхода блокировки OpenAI
HTTPS_PROXY=http://username:password@proxy-host:port
HTTP_PROXY=http://username:password@proxy-host:port
```

Примеры:
```bash
# С авторизацией
HTTPS_PROXY=http://user:pass@proxy.example.com:8080

# Без авторизации  
HTTPS_PROXY=http://proxy.example.com:8080

# SOCKS5 прокси
HTTPS_PROXY=socks5://proxy.example.com:1080
```

### 3. Перезапустить сервисы

```bash
ssh sve@37.110.51.35 -p 1040
cd /home/sve/ai-lawyer
npx pm2 restart ai-lawyer-backend
```

## Вариант 2: VPN на сервере

### 1. Установить VPN клиент

```bash
# OpenVPN
sudo apt-get install openvpn

# WireGuard
sudo apt-get install wireguard
```

### 2. Настроить VPN конфигурацию

Получите конфигурационный файл от вашего VPN провайдера.

### 3. Запустить VPN

```bash
# OpenVPN
sudo openvpn --config your-config.ovpn

# WireGuard
sudo wg-quick up wg0
```

### 4. Перезапустить сервисы

```bash
npx pm2 restart ai-lawyer-backend
```

## Вариант 3: Cloudflare WARP (Бесплатно)

### 1. Установить WARP

```bash
# Добавить репозиторий
curl https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list

# Установить
sudo apt-get update
sudo apt-get install cloudflare-warp
```

### 2. Настроить и запустить

```bash
# Регистрация
warp-cli register

# Подключиться
warp-cli connect

# Проверить статус
warp-cli status
```

### 3. Настроить прокси через WARP

```bash
# WARP создает локальный SOCKS5 прокси на порту 40000
echo "HTTPS_PROXY=socks5://127.0.0.1:40000" >> /home/sve/ai-lawyer/.env
```

## Вариант 4: Использовать только fallback (Без AI)

Если нет возможности настроить прокси, система будет работать с предустановленными ответами:

1. Удалите или закомментируйте API ключи в `.env`:
```bash
# WINDEXAI_API_KEY=
# OPENAI_API_KEY=
```

2. Система автоматически перейдет в fallback режим с готовыми ответами.

## Проверка работы прокси

### Тест подключения

```bash
# Без прокси (должна быть ошибка)
curl https://api.openai.com/v1/models

# С прокси
export HTTPS_PROXY=http://your-proxy:port
curl https://api.openai.com/v1/models -H "Authorization: Bearer sk-test"
```

### Проверка в приложении

```bash
# Проверить логи
npx pm2 logs ai-lawyer-backend

# Отправить тестовый запрос
curl -X POST http://37.110.51.35:1041/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Тест", "sessionId": "test"}'
```

Если прокси работает, вы увидите в логах:
```
info: 🔧 ChatService initialization {"hasProxy":true,"proxyUrl":"http://***@proxy:port"}
```

## Рекомендуемые прокси-сервисы

**Для тестирования (Бесплатно):**
- Cloudflare WARP
- ProtonVPN (Free tier)

**Для продакшена (Платно):**
- Bright Data (бывший Luminati)
- Smartproxy
- Proxy6.net (российский сервис)
- ProxyLine.net

**VPN сервисы:**
- Mullvad VPN
- ProtonVPN
- NordVPN
- ExpressVPN

## Альтернативы OpenAI

Если не хотите использовать прокси, можно использовать альтернативные API:

1. **YandexGPT** - российская альтернатива (без блокировки)
2. **GigaChat** - от Сбера
3. **Anthropic Claude** - через AWS Bedrock
4. **Azure OpenAI** - OpenAI через Microsoft Azure

## Поддержка

При возникновении проблем проверьте:
1. Работает ли прокси: `curl -x $HTTPS_PROXY https://api.openai.com`
2. Видит ли приложение прокси: проверьте логи PM2
3. Правильно ли указан формат прокси в `.env`


