# 🔧 СЛЕДУЮЩИЕ ШАГИ ДЛЯ ОТЛАДКИ

## Что было сделано

✅ Добавлено **подробное логирование** в:
1. `src/pages/DocumentsAnalysis.js` - функция `loadFullDocumentAnalysis`
2. `src/components/DocumentDetailView.js` - начало компонента

## Что нужно сделать

### 1️⃣ Обновите браузер (Hard Refresh)

```
Mac: Cmd + Shift + R
Windows/Linux: Ctrl + Shift + R
```

### 2️⃣ Откройте DevTools Console

```
F12 → Console tab
```

### 3️⃣ Нажмите 👁️ на любом документе

### 4️⃣ В консоли ищите логи:

**Вы должны видеть последовательность:**

```
📄 Document from API: { ... }
📄 Converted documents: Array(...)

[После нажатия 👁️]

📡 API response for document: { success: true, data: { ... } }
📋 Full doc object from API: { id, filename, analysis, ... }
🔍 doc.analysis field: { risks: [...], recommendations: [...] }
🔍 doc object keys: ["id", "filename", "analysis", ...]
🔍 loadFullDocumentAnalysis - doc.analysis: { risks: [...], ... }
✅ Full analysis loaded: { risks: [...], recommendations: [...] }

🔍 DocumentDetailView received document: { id, name, analysis: {...} }
🔍 document.analysis: { risks: [...], ... }
🔍 document.extracted_text: "ПОСТАНОВЛЕНИЕ..."
```

## 📊 Что это означает

### ✅ Если видите все логи:
- Анализ загружается правильно
- Данные доходят до компонента
- Проблема в отображении компонента

**Действие:** Проверьте, показывается ли анализ на странице

### ❌ Если логи заканчиваются раньше:
- `📡 API response` не появляется → проблема в fetch
- `📋 Full doc object` не появляется → проблема в парсинге ответа
- `🔍 doc.analysis field: null` → анализ не приходит из API

**Действие:** Проверьте Network tab в DevTools

## 🔍 Проверка Network вкладки

1. Откройте **DevTools → Network**
2. **Очистите логи** (кнопка X)
3. **Нажмите 👁️**
4. **Ищите запрос** `documents/doc_1760984400558...` (последний ID из URL)
5. **Кликните на него**
6. **Смотрите Response:**

```json
{
  "success": true,
  "data": {
    "id": "doc_1760984400558_e4xpwrbn",
    "filename": "2025-10-14 16.50.43.jpg",
    "analysis": {
      "risks": [
        {
          "category": "процессуальный риск",
          "description": "..."
        }
      ],
      "recommendations": [...]
    }
  }
}
```

**Проверьте:**
- [ ] `response.success === true`?
- [ ] `response.data.analysis` существует?
- [ ] `response.data.analysis.risks` - это массив?
- [ ] `response.data.analysis.recommendations` - это массив?

## 🎯 Что дальше

После отладки **сообщите мне логи из консоли:**
- Какие логи видите?
- На каком логе они заканчиваются?
- Какой ответ приходит из Network?

**Это поможет мне понять точную проблему и исправить её!**

---

*Статус: 🔍 ОЖИДАНИЕ ОТЛАДОЧНЫХ ЛОГОВ*
