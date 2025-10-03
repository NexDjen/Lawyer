#!/bin/bash

# Скрипт для исправления конфигурации Apache для поддержки больших файлов
# Запускать на сервере: ssh sve@37.110.51.35 -p 1040

echo "🔧 Исправление конфигурации Apache для поддержки больших файлов..."

# Проверяем, что скрипт запущен с правами sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ Пожалуйста, запустите скрипт с правами sudo: sudo bash fix_apache_config.sh"
    exit 1
fi

# Находим конфигурационные файлы Apache
APACHE_CONF=""
if [ -f "/etc/apache2/apache2.conf" ]; then
    APACHE_CONF="/etc/apache2/apache2.conf"
    echo "✅ Найден основной конфигурационный файл: $APACHE_CONF"
elif [ -f "/etc/httpd/httpd.conf" ]; then
    APACHE_CONF="/etc/httpd/httpd.conf"
    echo "✅ Найден основной конфигурационный файл: $APACHE_CONF"
else
    echo "❌ Не удалось найти конфигурационный файл Apache"
    exit 1
fi

# Создаем резервную копию
cp "$APACHE_CONF" "${APACHE_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Создана резервная копия конфигурации"

# Добавляем настройки для больших файлов
echo "" >> "$APACHE_CONF"
echo "# Настройки для поддержки больших файлов (добавлено $(date))" >> "$APACHE_CONF"
echo "LimitRequestBody 5368709120  # 5GB" >> "$APACHE_CONF"
echo "LimitRequestFields 1000" >> "$APACHE_CONF"
echo "LimitRequestFieldSize 1048576  # 1MB для полей" >> "$APACHE_CONF"
echo "LimitRequestLine 8192" >> "$APACHE_CONF"
echo "" >> "$APACHE_CONF"

# Ищем конфигурацию виртуального хоста для w-lawyer.ru
VHOST_CONF=""
if [ -f "/etc/apache2/sites-available/w-lawyer.ru.conf" ]; then
    VHOST_CONF="/etc/apache2/sites-available/w-lawyer.ru.conf"
elif [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
    VHOST_CONF="/etc/apache2/sites-available/000-default.conf"
fi

if [ -n "$VHOST_CONF" ]; then
    echo "✅ Найден конфигурационный файл виртуального хоста: $VHOST_CONF"
    
    # Создаем резервную копию
    cp "$VHOST_CONF" "${VHOST_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Добавляем настройки для виртуального хоста
    echo "" >> "$VHOST_CONF"
    echo "    # Настройки для поддержки больших файлов (добавлено $(date))" >> "$VHOST_CONF"
    echo "    LimitRequestBody 5368709120  # 5GB" >> "$VHOST_CONF"
    echo "    ProxyPreserveHost On" >> "$VHOST_CONF"
    echo "    ProxyTimeout 300" >> "$VHOST_CONF"
    echo "    ProxyPass /api/ http://localhost:80/api/" >> "$VHOST_CONF"
    echo "    ProxyPassReverse /api/ http://localhost:80/api/" >> "$VHOST_CONF"
    echo "" >> "$VHOST_CONF"
fi

# Проверяем, есть ли PHP и настраиваем его
if command -v php &> /dev/null; then
    echo "✅ PHP найден, настраиваем лимиты..."
    
    # Находим php.ini
    PHP_INI=""
    if [ -f "/etc/php/8.1/apache2/php.ini" ]; then
        PHP_INI="/etc/php/8.1/apache2/php.ini"
    elif [ -f "/etc/php/8.0/apache2/php.ini" ]; then
        PHP_INI="/etc/php/8.0/apache2/php.ini"
    elif [ -f "/etc/php/7.4/apache2/php.ini" ]; then
        PHP_INI="/etc/php/7.4/apache2/php.ini"
    fi
    
    if [ -n "$PHP_INI" ]; then
        echo "✅ Найден php.ini: $PHP_INI"
        
        # Создаем резервную копию
        cp "$PHP_INI" "${PHP_INI}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Обновляем настройки PHP
        sed -i 's/upload_max_filesize = .*/upload_max_filesize = 5G/' "$PHP_INI"
        sed -i 's/post_max_size = .*/post_max_size = 5G/' "$PHP_INI"
        sed -i 's/max_execution_time = .*/max_execution_time = 300/' "$PHP_INI"
        sed -i 's/max_input_time = .*/max_input_time = 300/' "$PHP_INI"
        sed -i 's/memory_limit = .*/memory_limit = 512M/' "$PHP_INI"
        
        echo "✅ Настройки PHP обновлены"
    fi
fi

# Проверяем синтаксис конфигурации Apache
echo "🔍 Проверяем синтаксис конфигурации Apache..."
if apache2ctl configtest; then
    echo "✅ Синтаксис конфигурации Apache корректен"
    
    # Перезапускаем Apache
    echo "🔄 Перезапускаем Apache..."
    systemctl restart apache2
    
    if systemctl is-active --quiet apache2; then
        echo "✅ Apache успешно перезапущен"
    else
        echo "❌ Ошибка при перезапуске Apache"
        systemctl status apache2
        exit 1
    fi
else
    echo "❌ Ошибка в синтаксисе конфигурации Apache"
    echo "Восстанавливаем резервную копию..."
    cp "${APACHE_CONF}.backup.$(date +%Y%m%d_%H%M%S)" "$APACHE_CONF"
    exit 1
fi

echo ""
echo "🎉 Настройка завершена успешно!"
echo ""
echo "📋 Что было сделано:"
echo "  - Увеличен лимит размера загружаемых файлов до 5GB"
echo "  - Настроены лимиты для полей и заголовков"
echo "  - Обновлены настройки PHP (если установлен)"
echo "  - Настроено проксирование на Node.js приложение"
echo ""
echo "🧪 Для тестирования:"
echo "  1. Попробуйте загрузить файл размером больше 1MB"
echo "  2. Проверьте логи: sudo tail -f /var/log/apache2/error.log"
echo "  3. Проверьте логи: sudo tail -f /var/log/apache2/access.log"
echo ""
echo "📁 Резервные копии созданы:"
echo "  - ${APACHE_CONF}.backup.*"
if [ -n "$VHOST_CONF" ]; then
    echo "  - ${VHOST_CONF}.backup.*"
fi
if [ -n "$PHP_INI" ]; then
    echo "  - ${PHP_INI}.backup.*"
fi
