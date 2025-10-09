# Инструкция по загрузке изменений на сервер

## Измененные файлы:
1. `src/components/Login.js` - убраны демо-данные
2. `src/pages/FillDocuments.css` - исправлены шрифты
3. `src/pages/Profile.js` - убраны демо-данные кошелька
4. `backend/services/walletService.js` - кошелек 100₽
5. `backend/routes/walletRoutes.js` - убраны демо-данные

## Шаги для загрузки:

### 1. Подключиться к серверу:
```bash
ssh sve@37.110.51.35 -p 1040
# Пароль: 640509040147
```

### 2. Перейти в директорию проекта:
```bash
cd /var/www/lawyer.windexs.ru
# или
cd /home/sve/lawyer.windexs.ru
```

### 3. Создать резервную копию:
```bash
cp -r src src_backup_$(date +%Y%m%d_%H%M%S)
cp -r backend backend_backup_$(date +%Y%m%d_%H%M%S)
```

### 4. Заменить файлы:

**Login.js:**
```bash
nano src/components/Login.js
# Вставить содержимое из локального файла
```

**FillDocuments.css:**
```bash
nano src/pages/FillDocuments.css
# Вставить содержимое из локального файла
```

**Profile.js:**
```bash
nano src/pages/Profile.js
# Вставить содержимое из локального файла
```

**walletService.js:**
```bash
nano backend/services/walletService.js
# Вставить содержимое из локального файла
```

**walletRoutes.js:**
```bash
nano backend/routes/walletRoutes.js
# Вставить содержимое из локального файла
```

### 5. Перезапустить сервисы:
```bash
# Если используется systemd:
sudo systemctl restart nginx
sudo systemctl restart backend

# Или если используется PM2:
pm2 restart all

# Или если используется Docker:
docker-compose restart
```

### 6. Проверить статус:
```bash
sudo systemctl status nginx
sudo systemctl status backend
```

## Альтернативный способ через SCP:

Если у вас есть доступ с паролем:
```bash
scp -P 1040 src/components/Login.js sve@37.110.51.35:/var/www/lawyer.windexs.ru/src/components/
scp -P 1040 src/pages/FillDocuments.css sve@37.110.51.35:/var/www/lawyer.windexs.ru/src/pages/
scp -P 1040 src/pages/Profile.js sve@37.110.51.35:/var/www/lawyer.windexs.ru/src/pages/
scp -P 1040 backend/services/walletService.js sve@37.110.51.35:/var/www/lawyer.windexs.ru/backend/services/
scp -P 1040 backend/routes/walletRoutes.js sve@37.110.51.35:/var/www/lawyer.windexs.ru/backend/routes/
```

## Проверка после загрузки:

1. Открыть https://lawyer.windexs.ru:1041
2. Проверить страницу входа - не должно быть демо-данных
3. Проверить кошелек в профиле - должен показывать 100₽
4. Проверить страницу "Заполнение документов" - шрифты должны быть исправлены
