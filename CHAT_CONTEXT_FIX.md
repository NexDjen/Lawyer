# Исправление: Галина не понимает контекст документа в чате

## Проблема
При попытке обсудить документ в чате Галина не понимала контекст документа и отвечала общими фразами:

```
Пользователь: привет
Галина: Привет! Готова помочь. Опишите ситуацию в двух предложениях: что вас беспокоит и какие документы у вас есть на руках?
```

**Ошибка в логах:**
```
warn: Не удалось загрузить контекст документа для чата {"docId":"doc_1761085540131_4wyeq5b1","error":"documentService.getDocumentById is not a function","timestamp":"2025-10-21 15:26:18"}
```

## Причина
В `chatController.js` использовался неправильный сервис для загрузки документа:

1. **Неправильный сервис**: Использовался `documentService.getDocumentById`, но эта функция не существует
2. **Неправильная функция анализа**: Использовался `getAnalysisById(docId)` вместо `getAnalysisByDocumentId(docId)`
3. **Отсутствие функции**: В `analysisService` не было функции для получения анализа по ID документа

## Решение

### 1. Исправлен сервис для загрузки документа

**Было:**
```javascript
const documentService = require('../services/documentService');
const docRecord = await documentService.getDocumentById(docId);
```

**Стало:**
```javascript
const documentStorageService = require('../services/documentStorageService');
const docRecord = await documentStorageService.getDocumentById(docId);
```

### 2. Добавлена функция получения анализа по ID документа

**Добавлено в `analysisService.js`:**
```javascript
/**
 * Получить анализ по ID документа
 */
async getAnalysisByDocumentId(documentId) {
  try {
    const analysis = await database.get(`
      SELECT * FROM document_analysis WHERE document_id = ? ORDER BY created_at DESC LIMIT 1
    `, [documentId]);

    if (!analysis) {
      return null;
    }

    // Парсим JSON поля
    return {
      id: analysis.id,
      userId: analysis.user_id,
      documentId: analysis.document_id,
      analysis: {
        summary: { mainIssues: JSON.parse(analysis.risks || '[]') },
        recommendations: JSON.parse(analysis.recommendations || '[]'),
        confidence: analysis.confidence
      },
      metadata: {
        analyzedAt: analysis.created_at,
        documentType: analysis.summary,
        fileName: `analysis_${analysis.id}`,
        docId: analysis.id,
        modelUsed: analysis.model_used
      }
    };
  } catch (error) {
    logger.error('Ошибка получения анализа по ID документа из БД:', error);
    throw error;
  }
}
```

### 3. Исправлен вызов функции анализа

**Было:**
```javascript
const analysis = await analysisService.getAnalysisById(docId);
```

**Стало:**
```javascript
const analysis = await analysisService.getAnalysisByDocumentId(docId);
```

## Ключевые изменения

### ✅ **Правильная загрузка контекста:**

1. **Документ**: Загружается через `documentStorageService.getDocumentById()`
2. **Анализ**: Загружается через `analysisService.getAnalysisByDocumentId()`
3. **Контекст**: Добавляется в историю чата как system message

### ✅ **Улучшенная обработка ошибок:**

- Graceful fallback при ошибках загрузки
- Информативные логи для диагностики
- Продолжение работы чата даже при проблемах с контекстом

### ✅ **Правильная структура данных:**

- Корректный парсинг JSON полей из БД
- Правильное формирование контекста для LLM
- Совместимость с существующей структурой анализа

## Результат

### ❌ **Больше не происходит:**
- Ошибки `documentService.getDocumentById is not a function`
- Игнорирование контекста документа в чате
- Общие ответы без понимания содержимого документа

### ✅ **Теперь работает:**
- Корректная загрузка контекста документа
- Понимание Галиной содержимого документа
- Контекстуальные ответы на основе анализа документа
- Правильная передача анализа в чат

## Пример работы

**Теперь при обсуждении документа:**
1. Загружается содержимое документа
2. Загружается анализ документа
3. Контекст добавляется в промпт
4. Галина отвечает с пониманием документа

**Результат:**
```
Пользователь: привет
Галина: Привет! Я вижу, что у вас есть постановление об отказе в возбуждении уголовного дела по факту мошенничества. В документе указано, что автомобиль BMW 1999 года выпуска был зарегистрирован на ваше имя без вашего ведома. Как я могу помочь с этим делом?
```

## Файлы изменены
1. `backend/controllers/chatController.js` - исправлен сервис загрузки документа
2. `backend/services/analysisService.js` - добавлена функция `getAnalysisByDocumentId`

## Дата исправления
21 октября 2025 года

## Статус
✅ ИСПРАВЛЕНО И ПРОТЕСТИРОВАНО




