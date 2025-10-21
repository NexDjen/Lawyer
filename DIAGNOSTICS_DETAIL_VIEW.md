# 🔍 ДИАГНОСТИКА: Почему анализ не открывается при нажатии 👁️

## Проблема
При нажатии на 👁️ "Просмотреть документ" открывается только **"📄 Содержимое документа"** (JSON), а не полный анализ от Галины.

## Где происходит проблема

### 1️⃣ Загрузка полного документа
**Файл:** `src/pages/DocumentsAnalysis.js`  
**Функция:** `loadFullDocumentAnalysis`  
**Строка:** 174-179

```javascript
const handleViewDocument = async (document) => {
  const fullDocument = await loadFullDocumentAnalysis(document.id, document);
  setSelectedDocument(fullDocument);  // ← Документ с анализом
  setViewMode('detail');
};
```

**Что происходит:**
- Загружаются полные данные документа с сервера
- Должен быть `document.analysis` с риск пунктами

### 2️⃣ Отображение анализа
**Файл:** `src/components/DocumentDetailView.js`  
**Строка:** 328

```javascript
{document.analysis && (  // ← ЭТОТ ЕСЛИ ДОЛЖЕН БЫТЬ TRUE!
  <div className="llm-analysis-container">
    {/* Анализ отображается здесь */}
  </div>
)}
```

**Что происходит:**
- Если `document.analysis` существует → показываем анализ ✅
- Если `document.analysis === null` → показываем только JSON ❌

## 🧪 Как отладить

### Шаг 1: Откройте консоль браузера
```
F12 → Console
```

### Шаг 2: Посмотрите логи в DocumentsAnalysis.js

**Должны видеть:**
```
🔍 doc.analysis: {risks: [...], recommendations: [...]}
🔍 doc.analysis_result: null
🔍 doc.analysisResult: undefined
✅ Final analysisResult: {risks: [...], recommendations: [...]}
```

### Шаг 3: Нажмите 👁️ и посмотрите логи в DocumentDetailView.js

**Должны видеть:**
```
🔍 DocumentDetailView received document: {id: "...", name: "...", analysis: {...}}
🔍 document.analysis: {risks: [...], recommendations: [...]}
🔍 document.extracted_text: "ПОСТАНОВЛЕНИЕ..."
```

### Шаг 4: Проверьте Network вкладку

1. Откройте DevTools → Network
2. Нажмите 👁️
3. Должен быть запрос `GET /api/documents/{documentId}`
4. Ответ должен содержать:
```json
{
  "success": true,
  "data": {
    "analysis": {
      "risks": [...],
      "recommendations": [...]
    }
  }
}
```

## 🔴 Если анализ не показывается

### Вариант 1: `document.analysis === null` в DocumentDetailView

**Причина:** Функция `loadFullDocumentAnalysis` не загрузила анализ правильно

**Решение:** Проверить логи в `loadFullDocumentAnalysis` в консоли

### Вариант 2: Анализ есть, но неправильный формат

**Проверить:** Есть ли у анализа нужные поля:
- `risks` (массив) ✅
- `recommendations` (массив) ✅
- `expertOpinion` (строка) - опционально
- `legalErrors` (массив) - опционально

### Вариант 3: Данные не дошли из backend

**Проверить Network:**
1. Запрос к `/api/documents/{documentId}` вернул ошибку?
2. Анализ вообще находится в ответе?

## 📊 Чек-лист отладки

- [ ] Консоль показывает `🔍 DocumentDetailView received document`?
- [ ] `document.analysis` не равен `null`?
- [ ] Network запрос к `/api/documents/{id}` успешен (200)?
- [ ] Ответ содержит поле `analysis` с данными?
- [ ] Поле `analysis` содержит `risks` и `recommendations`?

## 🎯 Ожидаемый результат

**В консоли должны видеть ВСЕ эти логи:**

```
✅ Final analysisResult: {risks: [...], recommendations: [...]}
🔍 DocumentDetailView received document: {analysis: {...}}
🔍 document.analysis: {risks: [...]}
```

**На странице должны видеть:**
```
📄 Содержимое документа
└─ [JSON text]

📊 Экспертный анализ от Галины
├─ 💼 Экспертное мнение
├─ ⚠️ Юридические ошибки
├─ 🚨 Выявленные риски
├─ 💡 Рекомендации Галины
├─ 🎯 Следующие шаги
└─ ✅ Соответствие требованиям
```

---

*Дата: 20 октября 2025*  
*Статус: 🔍 В ОТЛАДКЕ*
