# 🔍 ОТЛАДКА ОТОБРАЖЕНИЯ АНАЛИЗА

## Проблема

При открытии списка документов анализ не отображается в карточках, только содержимое документа.

## Корень проблемы

API возвращает анализ в разных местах:

```javascript
// ❌ БЫЛО (null):
{
  "analysis_result": null,
  
  // ✅ НО ЕСТЬ:
  "analysis": {
    "risks": [...],
    "recommendations": [...],
    "summary": "...",
    "confidence": 0.85
  }
}
```

## Решение

Изменена логика загрузки в `src/pages/DocumentsAnalysis.js`:

### Было:
```javascript
let analysisResult = doc.analysis_result || doc.analysisResult;
// Результат: null ❌
```

### Стало:
```javascript
// Сначала проверяем подробный анализ из БД
let analysisResult = doc.analysis;

// Если нет, ищем в других полях
if (!analysisResult) {
  analysisResult = doc.analysis_result || doc.analysisResult;
}
// Результат: {risks, recommendations, ...} ✅
```

## Что происходит теперь

1. **При загрузке списка** (`/api/documents/user/{id}`):
   - Backend возвращает поле `analysis` с подробными данными
   - Frontend парсит его и использует для отображения

2. **В карточке документа**:
   - Показываются ошибки, риски, рекомендации
   - При нажатии 👁️ открывается полный просмотр

3. **В консоли браузера (F12)**:
   - Логи: `✅ Using analysis: {...}`
   - Видно что анализ загружен правильно

## Что проверить

1. Откройте http://localhost:3000
2. Перейдите на "Анализ документов"
3. Нажмите F12 → Console
4. Ищите логи с `✅ Using analysis`
5. Перезагрузите страницу (Cmd+Shift+R)

