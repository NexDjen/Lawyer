# Исправление ошибки 413 "Request Entity Too Large" в Apache

## Проблема
Ошибка 413 возникает на уровне Apache сервера, который блокирует загрузку файлов до того, как они дойдут до Node.js приложения.

## Решение

### 1. Настройка Apache на сервере

Подключитесь к серверу и выполните следующие команды:

```bash
ssh sve@37.110.51.35 -p 1040
```

#### Найти конфигурационные файлы Apache:
```bash
# Найти основной конфигурационный файл
sudo find /etc -name "apache2.conf" -o -name "httpd.conf" 2>/dev/null

# Найти конфигурацию виртуального хоста для w-lawyer.ru
sudo find /etc -name "*.conf" -path "*/apache2/*" -o -path "*/httpd/*" | grep -i lawyer
```

#### Отредактировать конфигурацию Apache:
```bash
# Открыть основной конфигурационный файл
sudo nano /etc/apache2/apache2.conf

# Или конфигурацию виртуального хоста
sudo nano /etc/apache2/sites-available/w-lawyer.ru.conf
```

#### Добавить/изменить следующие директивы:

```apache
# Увеличить лимиты для загрузки файлов
LimitRequestBody 5368709120  # 5GB в байтах
LimitRequestFields 1000
LimitRequestFieldSize 1048576  # 1MB для полей
LimitRequestLine 8192

# Для модуля mod_php (если используется)
php_value upload_max_filesize 5G
php_value post_max_size 5G
php_value max_execution_time 300
php_value max_input_time 300
php_value memory_limit 512M

# Для проксирования на Node.js
ProxyPreserveHost On
ProxyTimeout 300
ProxyPass /api/ http://localhost:80/api/
ProxyPassReverse /api/ http://localhost:80/api/
```

#### Перезапустить Apache:
```bash
sudo systemctl restart apache2
# или
sudo service apache2 restart
```

### 2. Альтернативное решение через .htaccess

Если у вас есть доступ к .htaccess файлу в корне сайта:

```apache
# .htaccess в корне сайта w-lawyer.ru
LimitRequestBody 5368709120
php_value upload_max_filesize 5G
php_value post_max_size 5G
php_value max_execution_time 300
php_value max_input_time 300
php_value memory_limit 512M
```

### 3. Проверка конфигурации

После внесения изменений проверьте:

```bash
# Проверить синтаксис конфигурации Apache
sudo apache2ctl configtest

# Проверить статус Apache
sudo systemctl status apache2

# Посмотреть логи ошибок
sudo tail -f /var/log/apache2/error.log
```

### 4. Тестирование

После настройки протестируйте загрузку файлов:

1. Попробуйте загрузить файл размером больше 1MB
2. Проверьте логи Apache: `sudo tail -f /var/log/apache2/access.log`
3. Проверьте логи Node.js приложения

## Дополнительные настройки

### Если используется Nginx вместо Apache:

```nginx
# В конфигурации nginx
client_max_body_size 5G;
client_body_timeout 300s;
client_header_timeout 300s;
proxy_read_timeout 300s;
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
```

### Проверка текущих лимитов:

```bash
# Проверить текущие лимиты Apache
apache2ctl -M | grep -i limit
apache2ctl -S

# Проверить PHP лимиты (если используется)
php -i | grep -E "(upload_max_filesize|post_max_size|max_execution_time)"
```

## Мониторинг

После настройки следите за логами:

```bash
# Логи Apache
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log

# Логи Node.js (если есть)
tail -f /path/to/your/app/logs/app.log
```

## Примечания

- Убедитесь, что на сервере достаточно места на диске для загрузки больших файлов
- Проверьте, что Node.js приложение может обрабатывать файлы такого размера
- Рассмотрите возможность добавления прогресс-бара для загрузки больших файлов
