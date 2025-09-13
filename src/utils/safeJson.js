// Утилита для безопасного парсинга JSON
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    if (typeof jsonString !== 'string') {
      return fallback;
    }
    
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.warn('Ошибка парсинга JSON:', error);
    return fallback;
  }
};

// Утилита для безопасного fetch с JSON парсингом
export const safeFetchJson = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Проверяем, что получили JSON, а не HTML
    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.warn('Получен HTML вместо JSON, используем fallback');
      throw new Error('Получен HTML вместо JSON');
    }
    
    const data = safeJsonParse(text);
    
    if (data === null) {
      throw new Error('Не удалось распарсить JSON ответ');
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при fetch:', error);
    throw error;
  }
};

// Утилита для безопасного fetch с автоматическим fallback
export const safeFetchWithFallback = async (url, fallbackData, options = {}) => {
  try {
    return await safeFetchJson(url, options);
  } catch (error) {
    console.warn(`Ошибка при запросе к ${url}, используем fallback:`, error.message);
    return fallbackData;
  }
};

// Тестовые данные для fallback
export const getFallbackKnowledgeBase = () => ({
  legalKnowledgeBase: [
    {
      id: "test_1",
      topic: "Гражданское право",
      content: "Гражданский кодекс РФ регулирует имущественные и личные неимущественные отношения между гражданами, юридическими лицами и государством.",
      category: "Гражданское право",
      relevance: 0.9,
      keywords: ["гражданский кодекс", "имущественные отношения", "договор"],
      source: "ГК РФ",
      url: "https://pravo.gov.ru"
    },
    {
      id: "test_2",
      topic: "Трудовое право",
      content: "Трудовой кодекс РФ устанавливает права и обязанности работников и работодателей, регулирует трудовые отношения.",
      category: "Трудовое право",
      relevance: 0.8,
      keywords: ["трудовой кодекс", "работник", "работодатель", "трудовой договор"],
      source: "ТК РФ",
      url: "https://pravo.gov.ru"
    }
  ]
});

export const getFallbackNews = () => [
  {
    title: 'Обновление законодательства',
    content: 'Внесены изменения в Налоговый кодекс РФ, касающиеся упрощения налоговой отчетности для малого бизнеса.',
    url: 'https://pravo.gov.ru'
  },
  {
    title: 'Новые нормы трудового права',
    content: 'Обновлены правила удаленной работы и защиты прав работников в соответствии с Трудовым кодексом РФ.',
    url: 'https://duma.gov.ru'
  }
]; 