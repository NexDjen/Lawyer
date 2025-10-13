import { useState, useCallback } from 'react';
import { safeFetchWithFallback, getFallbackNews } from '../utils/safeJson';
import { buildApiUrl } from '../config/api';

// Константы для API
const API_ENDPOINTS = {
  CHAT: buildApiUrl('/chat'),
  NEWS: buildApiUrl('/news')
};

// Константы для статусов
const API_STATUS = {
  CONNECTED: 'connected',
  ERROR: 'error',
  LOADING: 'loading'
};

// Константы для типов сообщений
const MESSAGE_TYPES = {
  USER: 'user',
  BOT: 'bot',
  SYSTEM: 'system'
};

export const useChat = (userId = null) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [apiStatus, setApiStatus] = useState(API_STATUS.CONNECTED);
  const [useWebSearch, setUseWebSearch] = useState(true);

  // Форматирование ответа AI
  const formatAIResponse = useCallback((response) => {
    // Отключаем агрессивную логику детекции шаблонных ответов
    // которая заменяла нормальные ответы на шаблон анализа документа
    
    // Проверяем только на действительно шаблонные ответы
    const isTrulyTemplate = response.includes('требуется определить') && 
                           response.includes('требуется указать') &&
                           response.length < 200; // Очень короткие шаблоны
    
    if (isTrulyTemplate) {
      return `📄 АНАЛИЗ ДОКУМЕНТА

🔍 Тип документа: [Требуется определить точный тип документа]

👥 Стороны: [Требуется указать все стороны с реквизитами]

📋 Существенные условия:
✅ [Требуется проанализировать каждое условие с номером пункта]

🟢 Сильные стороны:
✔️ [Требуется выявить конкретные преимущества документа]

⚠️ Выявленные риски:
❌ [Требуется указать конкретные пункты и проблемы с ссылками на статьи законов]

💡 Рекомендации и примеры формулировок:
✅ [Требуется дать готовые формулировки с указанием где их вставить]

⚖️ Соответствие законодательству:
📋 Применимые нормы права:
- [Требуется указать конкретные главы и статьи]

✅ Соответствующие требованиям:
- [Требуется указать что соответствует с указанием статей]

❌ Требующие доработки:
- [Требуется указать что не соответствует с указанием статей]

🎯 Практические советы:
💡 [Требуется дать конкретные действия]
💡 [Требуется предложить альтернативные решения]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ВНИМАНИЕ: AI выдал шаблонный ответ. Пожалуйста, проанализируйте документ заново с конкретными деталями.

💡 ПОДСКАЗКА: Используйте команду "Проанализируй документ заново с указанием конкретных пунктов, статей законов и готовых формулировок"`;
    }

    if (response.includes('\n')) {
      return response;
    }

    if (response.includes('АНАЛИЗ ДОКУМЕНТА') || response.includes('Тип документа')) {
      return response
        .replace(/(📄 АНАЛИЗ ДОКУМЕНТА)/g, '\n\n$1\n')
        .replace(/(🔍 Тип документа:)/g, '\n$1')
        .replace(/(👥 Стороны:)/g, '\n\n$1')
        .replace(/(📋 Существенные условия:)/g, '\n\n$1')
        .replace(/(🟢 Сильные стороны:)/g, '\n\n$1')
        .replace(/(⚠️ Выявленные риски:)/g, '\n\n$1')
        .replace(/(💡 Рекомендации)/g, '\n\n$1')
        .replace(/(⚖️ Соответствие законодательству:)/g, '\n\n$1')
        .replace(/(📋 Применимые нормы права:)/g, '\n$1')
        .replace(/(✅ Соответствующие требованиям:)/g, '\n\n$1')
        .replace(/(❌ Требующие доработки:)/g, '\n\n$1')
        .replace(/(🎯 Практические советы)/g, '\n\n$1')
        .replace(/(━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━)/g, '\n\n$1\n');
    }

    return response;
  }, []);

  // Обработка ошибок API
  const handleApiError = useCallback((error) => {
    console.error('Ошибка при обращении к WindexAI API:', error);
    setApiStatus(API_STATUS.ERROR);
    
    let errorMessage = 'Произошла ошибка при обработке запроса.';
    
    if (error.message.includes('400')) {
      errorMessage = 'WindexAI API ключ не настроен. Обратитесь к администратору.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorMessage = 'Ошибка авторизации WindexAI API. Проверьте API ключ.';
    } else if (error.message.includes('429')) {
      errorMessage = 'Превышен лимит запросов к WindexAI API. Подождите немного и попробуйте снова.';
    } else if (error.message.includes('500')) {
      errorMessage = 'Временные технические проблемы. Попробуйте позже.';
    }
    
    return {
      id: Date.now() + 1,
      type: MESSAGE_TYPES.BOT,
      content: errorMessage,
      timestamp: new Date()
    };
  }, []);

  // Отправка сообщения
  const sendMessage = useCallback(async (message, forceSend = false) => {
    if (!message.trim() && !forceSend) return;

    // Ограничения по подписке (free: 10 сообщений/день)
    try {
      const currentUserRaw = localStorage.getItem('currentUser');
      if (currentUserRaw) {
        const currentUser = JSON.parse(currentUserRaw);
        const today = new Date().toISOString().slice(0, 10);
        const isNewDay = currentUser.lastUsageDate !== today;
        if (isNewDay) {
          currentUser.dailyMessages = 0;
          currentUser.lastUsageDate = today;
        }

        // Увеличиваем счётчик и сохраняем
        currentUser.dailyMessages = (currentUser.dailyMessages || 0) + 1;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        // Обновляем запись в users
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const idx = users.findIndex(u => u.id === currentUser.id);
        if (idx >= 0) {
          users[idx] = currentUser;
          localStorage.setItem('users', JSON.stringify(users));
        }
      }
    } catch (_) {}

    const userMessage = {
      id: Date.now(),
      type: MESSAGE_TYPES.USER,
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setApiStatus(API_STATUS.LOADING);

    try {
      const response = await fetch(API_ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include credentials for CORS
        body: JSON.stringify({
          message: message,
          conversationHistory: messages.slice(-10),
          useWebSearch: useWebSearch,
          userId: userId // Добавляем userId для извлечения персональных данных
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(`${response.status}: ${errorData.error || 'Unknown error'}`);
      }

      // Read full response text and parse JSON with fallback
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { response: text };
      }
      const botMessage = {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.BOT,
        content: formatAIResponse(data.response),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setApiStatus(API_STATUS.CONNECTED);

      // Проверяем, содержит ли ответ документ для показа кнопок скачивания
      const isDoc = isDocumentMessage(data.response || '');
      if (isDoc) {
        botMessage.hasDownloadableContent = true;
      }



    } catch (error) {
      const errorMessage = handleApiError(error);
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
      setRetryCount(0);
    }
  }, [messages, useWebSearch, userId, formatAIResponse, handleApiError]);

  // Получение новостей
  const getLegalNews = useCallback(async () => {
    try {
      const news = await safeFetchWithFallback(
        () => fetch(API_ENDPOINTS.NEWS),
        getFallbackNews
      );
      return news;
    } catch (error) {
      console.error('Ошибка при получении новостей:', error);
      return getFallbackNews();
    }
  }, []);

  // Добавление системного сообщения
  const addSystemMessage = useCallback((content) => {
    const systemMessage = {
      id: Date.now(),
      type: MESSAGE_TYPES.SYSTEM,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  // Очистка чата
  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Функция для извлечения содержимого документа из сообщения
  const extractDocumentContent = useCallback((messageContent) => {
    // Проверяем, есть ли маркер документа
    const markerIndex = messageContent.indexOf('📄 ДОКУМЕНТ ГОТОВ К СКАЧИВАНИЮ');
    if (markerIndex === -1) {
      // Если маркера нет, возвращаем весь контент (не документ)
      return messageContent;
    }
    
    // Ищем разделитель "---" который отделяет консультацию от документа
    const separatorIndex = messageContent.indexOf('---');
    if (separatorIndex !== -1 && separatorIndex < markerIndex) {
      // Извлекаем только документ (текст между "---" и маркером)
      const documentText = messageContent.substring(separatorIndex + 3, markerIndex).trim();
      return documentText;
    }
    
    // Если разделителя нет, берем весь текст до маркера
    return messageContent.substring(0, markerIndex).trim();
  }, []);

  // Функция для скачивания документа из сообщения
  const downloadDocument = useCallback(async (messageContent, title = 'Юридический документ') => {
    try {
      const documentContent = extractDocumentContent(messageContent);
      
      const resp = await fetch('/api/chat/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title,
          content: documentContent.replace(/\n{2,}/g, '\n')
        })
      });

      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${title}-${Date.now()}.docx`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Не удалось сгенерировать документ');
      }
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
      alert('Ошибка при скачивании документа');
    }
  }, []);

  // Функция для скачивания PDF документа из сообщения
  const downloadPDF = useCallback(async (messageContent, title = 'Юридический документ') => {
    try {
      const documentContent = extractDocumentContent(messageContent);
      
      const resp = await fetch('/api/chat/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title,
          content: documentContent.replace(/\n{2,}/g, '\n')
        })
      });

      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${title}-${Date.now()}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Не удалось сгенерировать PDF документ');
      }
    } catch (error) {
      console.error('Ошибка скачивания PDF документа:', error);
      alert('Ошибка при скачивании PDF документа');
    }
  }, []);

  // Функция для отправки документа по email
  const emailDocument = useCallback(async (messageContent, title, email) => {
    try {
      const documentContent = extractDocumentContent(messageContent);
      
      const resp = await fetch('/api/chat/email-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email,
          title: title,
          content: documentContent.replace(/\n{2,}/g, '\n')
        })
      });

      if (resp.ok) {
        const result = await resp.json();
        alert(result.message || 'Документ будет отправлен на указанный email');
        return true;
      } else {
        const error = await resp.json();
        throw new Error(error.error || 'Не удалось отправить документ по email');
      }
    } catch (error) {
      console.error('Ошибка отправки документа по email:', error);
      alert('Ошибка при отправке документа по email: ' + error.message);
      return false;
    }
  }, []);

  // Функция для определения, содержит ли сообщение готовый документ
  const isDocumentMessage = useCallback((content) => {
    // Показываем кнопку скачивания только для готовых документов
    return content.includes('📄 ДОКУМЕНТ ГОТОВ К СКАЧИВАНИЮ');
  }, []);

  return {
    messages,
    isLoading,
    isRetrying,
    retryCount,
    apiStatus,
    useWebSearch,
    setUseWebSearch,
    sendMessage,
    getLegalNews,
    addSystemMessage,
    clearChat,
    downloadDocument,
    downloadPDF,
    emailDocument,
    isDocumentMessage,
    setRetryCount,
    setIsRetrying,
    setMessages
  };
}; 