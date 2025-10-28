# Исправление: Batch анализ документов - правильный поток OCR -> LLM

## Проблема
При загрузке нескольких документов каждый документ проходил индивидуальный анализ через `advanced-analysis` API, вместо единого batch анализа после завершения OCR всех документов.

**Логи в backend показывали:**
```
info: Starting advanced analysis {"documentType":"legal","fileName":"photo_2025-10-20 14.45.59.jpeg","textLength":231,"timestamp":"2025-10-21 15:07:34","userId":"1"}
info: Starting advanced analysis {"documentType":"legal","fileName":"photo_2025-10-20 14.46.14.jpeg","textLength":8703,"timestamp":"2025-10-21 15:07:38","userId":"1"}
```

Это означало, что каждый документ анализировался отдельно, а не как единое дело.

## Причина
В `DocumentUpload.js` логика была неправильной:

1. **Каждый файл** проходил индивидуальный OCR и анализ
2. **Batch анализ** запускался сразу при добавлении первого документа
3. **Не было ожидания** завершения OCR всех документов

## Решение

### 1. Исправлена логика определения batch режима

**Было:**
```javascript
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    if (file) {
      handleFileUpload(file); // Без информации о batch режиме
    }
  });
};
```

**Стало:**
```javascript
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files);
  
  // Determine if this is batch mode (multiple files)
  const isBatchMode = files.length > 1;
  
  if (isBatchMode) {
    console.log(`📦 Batch mode detected: ${files.length} files selected`);
  } else {
    console.log(`📄 Single file mode: ${files.length} file selected`);
  }
  
  files.forEach(file => {
    if (file) {
      handleFileUpload(file, isBatchMode); // Передаем информацию о batch режиме
    }
  });
};
```

### 2. Предотвращен индивидуальный анализ в batch режиме

**Было:**
```javascript
// Запускаем LLM анализ если есть распознанный текст
if (result && result.recognizedText && result.recognizedText.trim().length > 50) {
  // Only perform per-document LLM analysis for the first document
  if (uploadedDocuments.length < 1) {
    performLLMAnalysis(result.recognizedText, file.name);
  }
  // Always add to list for batch analysis
  // ...
}
```

**Стало:**
```javascript
// Запускаем LLM анализ если есть распознанный текст
if (result && result.recognizedText && result.recognizedText.trim().length > 50) {
  // Only perform per-document LLM analysis for single documents (not batch)
  // In batch mode, we wait for all OCR to complete, then do unified analysis
  
  if (!isBatchMode) {
    console.log('📄 Single document mode: starting individual analysis');
    performLLMAnalysis(result.recognizedText, file.name);
  } else {
    console.log('📦 Batch mode: skipping individual analysis, will do unified analysis after all OCR');
  }
  
  // Always add to list for batch analysis
  // ...
}
```

### 3. Исправлена логика запуска batch анализа

**Было:**
```javascript
// Auto-start batch analysis if multiple files or single PDF uploaded
useEffect(() => {
  if (!uploadedDocuments.length) return;
  const singlePdf = uploadedDocuments.length === 1 && uploadedDocuments[0].isPdf;
  if (uploadedDocuments.length > 1 || singlePdf) {
    handleBatchAnalysis();
  }
}, [uploadedDocuments]);
```

**Стало:**
```javascript
// Auto-start batch analysis if multiple files or single PDF uploaded
// BUT only if all documents have completed OCR
useEffect(() => {
  if (!uploadedDocuments.length) return;
  
  // Check if all documents have completed OCR
  const allDocumentsProcessed = uploadedDocuments.every(doc => 
    doc.status === 'analyzed' || doc.status === 'uploaded'
  );
  
  if (!allDocumentsProcessed) {
    console.log('⏳ Waiting for all documents to complete OCR...');
    return;
  }
  
  const singlePdf = uploadedDocuments.length === 1 && uploadedDocuments[0].isPdf;
  if (uploadedDocuments.length > 1 || singlePdf) {
    console.log('✅ All documents OCR completed, starting batch analysis...');
    handleBatchAnalysis();
  }
}, [uploadedDocuments]);
```

## Ключевые изменения

### ✅ **Правильный поток batch анализа:**

1. **Загрузка файлов** → Определение batch режима
2. **OCR всех файлов** → Параллельная обработка без анализа
3. **Ожидание завершения** → Проверка статуса всех документов
4. **Единый batch анализ** → Отправка всех текстов в LLM одним запросом
5. **Сохранение результата** → Как единое дело с иконкой "case"

### ✅ **Предотвращение индивидуального анализа:**

- В batch режиме `performLLMAnalysis` не вызывается
- Каждый документ только проходит OCR
- Анализ запускается только после завершения всех OCR

### ✅ **Улучшенное логирование:**

- Четкие сообщения о режиме работы
- Отслеживание прогресса OCR
- Информация о запуске batch анализа

## Результат

### ❌ **Больше не происходит:**
- Индивидуальный анализ каждого документа в batch режиме
- Множественные вызовы `advanced-analysis` API
- Неправильная последовательность обработки

### ✅ **Теперь работает:**
- Правильный поток: OCR всех → единый анализ
- Ожидание завершения всех OCR перед анализом
- Единый batch анализ всех документов как одного дела
- Корректное сохранение с иконкой "case"

## Файлы изменены
1. `src/components/DocumentUpload.js` - исправлена логика batch анализа

## Дата исправления
21 октября 2025 года

## Статус
✅ ИСПРАВЛЕНО И ПРОТЕСТИРОВАНО