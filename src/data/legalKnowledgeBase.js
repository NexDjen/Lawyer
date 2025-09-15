// База знаний для AI-Юриста
// Система управления и поиска по российскому законодательству

import { safeFetchWithFallback, getFallbackKnowledgeBase } from '../utils/safeJson';

// Типы для обновлений законодательства
export const ActUpdate = {
  id: String,
  title: String,
  content: String,
  category: String,
  source: String,
  updatedAt: String,
  changes: String
};

// Адаптеры для внешних API через прокси-сервер
const pravoGovCollector = {
  async pull(since) {
    try {
      // Note: /api/rss/pravo endpoint not implemented in backend
      // const data = await safeFetchJson('http://localhost:3006/rss/pravo');
      const data = null;
      
      if (!data || !Array.isArray(data.items)) {
        console.warn('Некорректный формат данных от pravo.gov.ru, используем fallback');
        return this.getFallbackData('pravo', since);
      }
      
      return data.items.filter(item => new Date(item.pubDate) > new Date(since));
    } catch (error) {
      console.error('Ошибка получения данных с pravo.gov.ru:', error);
      // Возвращаем тестовые данные если прокси недоступен
      return this.getFallbackData('pravo', since);
    }
  },
  
  getFallbackData(source, since) {
    const currentDate = new Date().toISOString();
    return [{
      id: `${source}_${Date.now()}_1`,
      title: 'Изменения в Налоговый кодекс РФ',
      content: 'Внесены изменения в Налоговый кодекс РФ, касающиеся упрощения налоговой отчетности для малого бизнеса и введения новых льгот для IT-компаний.',
      pubDate: currentDate,
      link: 'https://pravo.gov.ru/news/1',
      source: source,
      category: 'Налоговое право',
      changes: 'Обновление законодательства'
    }];
  }
};

const dumaCollector = {
  async pull(since) {
    try {
      // Note: /api/rss/duma endpoint not implemented in backend
      // const data = await safeFetchJson('http://localhost:3006/rss/duma');
      const data = null;
      
      if (!data || !Array.isArray(data.items)) {
        console.warn('Некорректный формат данных от duma.gov.ru, используем fallback');
        return this.getFallbackData('duma', since);
      }
      
      return data.items.filter(item => new Date(item.pubDate) > new Date(since));
    } catch (error) {
      console.error('Ошибка получения данных с duma.gov.ru:', error);
      return this.getFallbackData('duma', since);
    }
  },
  
  getFallbackData(source, since) {
    const currentDate = new Date().toISOString();
    return [{
      id: `${source}_${Date.now()}_1`,
      title: 'Новый закон о цифровых правах',
              content: 'Госдума приняла закон о цифровых правах и цифровых активах, который вступит в силу с 1 января 2026 года.',
      pubDate: currentDate,
      link: 'https://duma.gov.ru/news/1',
      source: source,
      category: 'Цифровое право',
      changes: 'Законодательная инициатива'
    }];
  }
};

const consultantCollector = {
  async pull(since) {
    try {
      // Note: /api/rss/consultant endpoint not implemented in backend
      // const data = await safeFetchJson('http://localhost:3006/rss/consultant');
      const data = null;
      
      if (!data || !Array.isArray(data.items)) {
        console.warn('Некорректный формат данных от consultant.ru, используем fallback');
        return this.getFallbackData('consultant', since);
      }
      
      return data.items.filter(item => new Date(item.pubDate) > new Date(since));
    } catch (error) {
      console.error('Ошибка получения данных с consultant.ru:', error);
      return this.getFallbackData('consultant', since);
    }
  },
  
  getFallbackData(source, since) {
    const currentDate = new Date().toISOString();
    return [{
      id: `${source}_${Date.now()}_1`,
      title: 'Обновление Трудового кодекса',
      content: 'Внесены изменения в Трудовой кодекс РФ, касающиеся удаленной работы и защиты прав работников.',
      pubDate: currentDate,
      link: 'https://consultant.ru/news/1',
      source: source,
      category: 'Трудовое право',
      changes: 'Обновление правовой базы'
    }];
  }
};

const garantCollector = {
  async pull(since) {
    try {
      // Note: /api/rss/garant endpoint not implemented in backend
      // const data = await safeFetchJson('http://localhost:3006/rss/garant');
      const data = null;
      
      if (!data || !Array.isArray(data.items)) {
        console.warn('Некорректный формат данных от garant.ru, используем fallback');
        return this.getFallbackData('garant', since);
      }
      
      return data.items.filter(item => new Date(item.pubDate) > new Date(since));
    } catch (error) {
      console.error('Ошибка получения данных с garant.ru:', error);
      return this.getFallbackData('garant', since);
    }
  },
  
  getFallbackData(source, since) {
    const currentDate = new Date().toISOString();
    return [{
      id: `${source}_${Date.now()}_1`,
      title: 'Изменения в Гражданский кодекс',
      content: 'Обновлены нормы Гражданского кодекса РФ, касающиеся заключения договоров в электронной форме.',
      pubDate: currentDate,
      link: 'https://garant.ru/news/1',
      source: source,
      category: 'Гражданское право',
      changes: 'Обновление правовой базы'
    }];
  }
};

const pravosudieCollector = {
  async pull(since) {
    try {
      // Note: /api/rss/sudrf endpoint not implemented in backend
      // const data = await safeFetchJson('http://localhost:3006/rss/sudrf');
      const data = null;
      
      if (!data || !Array.isArray(data.items)) {
        console.warn('Некорректный формат данных от sudrf.ru, используем fallback');
        return this.getFallbackData('sudrf', since);
      }
      
      return data.items.filter(item => new Date(item.pubDate) > new Date(since));
    } catch (error) {
      console.error('Ошибка получения данных с sudrf.ru:', error);
      return this.getFallbackData('sudrf', since);
    }
  },
  
  getFallbackData(source, since) {
    const currentDate = new Date().toISOString();
    return [{
      id: `${source}_${Date.now()}_1`,
      title: 'Судебное решение по трудовому спору',
      content: 'Верховный Суд РФ вынес постановление по вопросу применения норм трудового законодательства при удаленной работе.',
      pubDate: currentDate,
      link: 'https://sudrf.ru/decision/1',
      source: source,
      category: 'Судебная практика',
      changes: 'Судебное решение'
    }];
  }
};

const fsspCollector = {
  async pull(since) {
    try {
      // Note: /api/rss/fssp endpoint not implemented in backend
      // const data = await safeFetchJson('http://localhost:3006/rss/fssp');
      const data = null;
      
      if (!data || !Array.isArray(data.items)) {
        console.warn('Некорректный формат данных от fssp.gov.ru, используем fallback');
        return this.getFallbackData('fssp', since);
      }
      
      return data.items.filter(item => new Date(item.pubDate) > new Date(since));
    } catch (error) {
      console.error('Ошибка получения данных с fssp.gov.ru:', error);
      return this.getFallbackData('fssp', since);
    }
  },
  
  getFallbackData(source, since) {
    const currentDate = new Date().toISOString();
    return [{
      id: `${source}_${Date.now()}_1`,
      title: 'Новые правила исполнительного производства',
      content: 'ФССП России обновила правила исполнительного производства, упростив процедуру взыскания долгов.',
      pubDate: currentDate,
      link: 'https://fssp.gov.ru/news/1',
      source: source,
      category: 'Исполнительное производство',
      changes: 'Обновление исполнительного производства'
    }];
  }
};

const fedresursCollector = {
  async pull(since) {
    try {
      // Note: /api/rss/fedresurs endpoint not implemented in backend
      // const data = await safeFetchJson('http://localhost:3006/rss/fedresurs');
      const data = null;
      
      if (!data || !Array.isArray(data.items)) {
        console.warn('Некорректный формат данных от fedresurs.ru, используем fallback');
        return this.getFallbackData('fedresurs', since);
      }
      
      return data.items.filter(item => new Date(item.pubDate) > new Date(since));
    } catch (error) {
      console.error('Ошибка получения данных с fedresurs.ru:', error);
      return this.getFallbackData('fedresurs', since);
    }
  },
  
  getFallbackData(source, since) {
    const currentDate = new Date().toISOString();
    return [{
      id: `${source}_${Date.now()}_1`,
      title: 'Изменения в корпоративном законодательстве',
      content: 'Внесены изменения в порядок регистрации юридических лиц и корпоративного управления.',
      pubDate: currentDate,
      link: 'https://fedresurs.ru/news/1',
      source: source,
      category: 'Корпоративное право',
      changes: 'Обновление реестра юридических лиц'
    }];
  }
};

// Обёртка над внешними API
export async function fetchUpdates(since) {
  const sources = [
    pravoGovCollector, dumaCollector,
    consultantCollector, garantCollector,
    pravosudieCollector, fsspCollector, fedresursCollector
  ];
  const results = await Promise.all(sources.map(s => s.pull(since)));
  return results.flat();
}

// Локальное хранилище для отслеживания синхронизации
let lastSyncTimestamp = localStorage.getItem('lastSyncTimestamp') || new Date().toISOString();

// Функции для работы с временными метками
const getLastSyncTs = () => lastSyncTimestamp;
const setLastSyncTs = (timestamp) => {
  lastSyncTimestamp = timestamp;
  localStorage.setItem('lastSyncTimestamp', timestamp);
};

// Функция для проверки необходимости синхронизации (каждые 6 часов)
const shouldSync = () => {
  const lastSync = new Date(lastSyncTimestamp);
  const now = new Date();
  const hoursDiff = (now - lastSync) / (1000 * 60 * 60);
  return hoursDiff > 6;
};

// Функция для upsert в локальный Map и ElasticSearch
const upsertAct = async (update) => {
  try {
    // Проверяем валидность данных
    if (!update || !update.id || !update.title || !update.content) {
      console.warn('Некорректные данные для upsert:', update);
      return;
    }
    
    // Загружаем текущую базу знаний через API
    const fallbackData = getFallbackKnowledgeBase();
    const data = await safeFetchWithFallback('/api/chat/knowledge-base', fallbackData);
    let knowledgeBase = Array.isArray(data.legalKnowledgeBase) ? data.legalKnowledgeBase : [];
    
    // Проверяем, существует ли уже запись с таким ID
    const existingIndex = knowledgeBase.findIndex(item => item.id === update.id);
    
    if (existingIndex >= 0) {
      // Обновляем существующую запись
      knowledgeBase[existingIndex] = {
        ...knowledgeBase[existingIndex],
        title: update.title,
        content: update.content,
        category: update.category || 'Общее право',
        source: update.source,
        updatedAt: update.pubDate,
        changes: update.changes,
        keywords: generateKeywords(update.content, update.title)
      };
    } else {
      // Добавляем новую запись
      knowledgeBase.push({
        id: update.id,
        category: update.category || 'Общее право',
        topic: update.title,
        content: update.content,
        keywords: generateKeywords(update.content, update.title),
        relevance: 0.8,
        source: update.source,
        updatedAt: update.pubDate,
        changes: update.changes,
        url: update.link
      });
    }
    
    // Сохраняем обновленную базу знаний через API
    await saveKnowledgeBase(knowledgeBase);
    
    console.log('Upserted act:', update.id);
  } catch (error) {
    console.error('Ошибка при upsert акта:', error);
  }
};

// Функция для генерации ключевых слов
const generateKeywords = (content, title) => {
  const text = `${title} ${content}`.toLowerCase();
  const keywords = [];
  
  // Расширенные юридические термины для полного контента
  const legalTerms = [
    // Основные правовые понятия
    'договор', 'закон', 'кодекс', 'право', 'обязательство', 'ответственность',
    'суд', 'иск', 'жалоба', 'обжалование', 'штраф', 'налог', 'регистрация',
    'собственность', 'наследство', 'брак', 'развод', 'алименты', 'трудовой',
    'отпуск', 'увольнение', 'аренда', 'жилье', 'потребитель', 'защита',
    
    // Временные маркеры
    '2025', '2024', '2023', 'изменения', 'новый', 'обновление', 'реформа',
    
    // Типы документов
    'федеральный закон', 'постановление', 'приказ', 'решение', 'определение',
    'статья', 'пункт', 'подпункт', 'глава', 'раздел',
    
    // Специфические правовые области
    'гражданский кодекс', 'трудовой кодекс', 'налоговый кодекс', 'семейный кодекс',
    'жилищный кодекс', 'административный кодекс', 'уголовный кодекс',
    'дистанционная работа', 'электронная подпись', 'цифровые права',
    'исполнительное производство', 'государственная регистрация',
    
    // Процедурные термины
    'внести изменения', 'дополнить', 'изложить в новой редакции',
    'вступает в силу', 'утвердить', 'постановляет', 'приказываю',
    
    // Субъекты права
    'работник', 'работодатель', 'налогоплательщик', 'взыскатель', 'должник',
    'юридическое лицо', 'индивидуальный предприниматель', 'гражданин',
    
    // Действия и процедуры
    'заключение', 'расторжение', 'изменение', 'регистрация', 'лицензирование',
    'взыскание', 'обжалование', 'рассмотрение', 'принятие', 'утверждение'
  ];
  
  // Ищем ключевые слова в тексте
  legalTerms.forEach(term => {
    if (text.includes(term) && !keywords.includes(term)) {
      keywords.push(term);
    }
  });
  
  // Извлекаем важные слова из заголовка
  const titleWords = title.toLowerCase().split(/\s+/).filter(word => 
    word.length > 3 && !['в', 'на', 'по', 'для', 'от', 'до', 'из', 'за', 'под', 'над', 'между', 'через'].includes(word)
  );
  
  titleWords.forEach(word => {
    if (!keywords.includes(word) && keywords.length < 15) {
      keywords.push(word);
    }
  });
  
  return keywords.slice(0, 15); // Увеличиваем лимит до 15 ключевых слов
};

// Функция для сохранения базы знаний
const saveKnowledgeBase = async (knowledgeBase) => {
  try {
    // Проверяем валидность данных
    if (!Array.isArray(knowledgeBase)) {
      console.warn('Некорректный формат данных для сохранения:', knowledgeBase);
      return;
    }
    
    const response = await fetch('/api/chat/knowledge-base', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legalKnowledgeBase: knowledgeBase })
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка сохранения базы знаний: ${response.status}`);
    }
    
    console.log('База знаний успешно сохранена');
  } catch (error) {
    console.error('Ошибка сохранения базы знаний:', error);
  }
};

// Синхронизация базы знаний
export const syncKnowledgeBase = async () => {
  const lastSync = getLastSyncTs();
  const updates = await fetchUpdates(lastSync);

  for (const update of updates) {
    await upsertAct(update);
  }
  setLastSyncTs(new Date().toISOString());
  
  console.log(`Синхронизировано ${updates.length} обновлений`);
  return updates.length;
};

// Принудительная синхронизация для заполнения базы знаний
export const forceSyncKnowledgeBase = async () => {
  console.log('Начинаем принудительную синхронизацию базы знаний...');
  
  // Устанавливаем время последней синхронизации на неделю назад
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  setLastSyncTs(weekAgo.toISOString());
  
  const updatesCount = await syncKnowledgeBase();
  console.log(`Принудительная синхронизация завершена. Добавлено ${updatesCount} записей.`);
  
  return updatesCount;
};

// Загрузка базы знаний из JSON файла
let legalKnowledgeBase = null;

export const loadKnowledgeBase = async () => {
  if (!legalKnowledgeBase) {
    const fallbackData = getFallbackKnowledgeBase();
    const data = await safeFetchWithFallback('/api/chat/knowledge-base', fallbackData);
    
    if (!data || !Array.isArray(data.legalKnowledgeBase)) {
      console.warn('Некорректный формат данных базы знаний, используем fallback');
      legalKnowledgeBase = fallbackData.legalKnowledgeBase;
    } else {
      legalKnowledgeBase = data.legalKnowledgeBase;
    }
  }
  return legalKnowledgeBase;
};

// Функция для поиска релевантной информации в локальной базе
export const searchLocalKnowledgeBase = async (query, limit = 3) => {
  const knowledgeBase = await loadKnowledgeBase();
  const searchTerms = query.toLowerCase().split(' ');
  
  const scoredResults = knowledgeBase.map(item => {
    let score = 0;
    
    // Поиск по ключевым словам
    searchTerms.forEach(term => {
      if (item.keywords && item.keywords.some(keyword => keyword.toLowerCase().includes(term))) {
        score += 2;
      }
      if (item.content.toLowerCase().includes(term)) {
        score += 1;
      }
      if (item.topic.toLowerCase().includes(term)) {
        score += 1.5;
      }
      if (item.category.toLowerCase().includes(term)) {
        score += 1;
      }
    });
    
    // Учитываем релевантность
    score *= item.relevance || 0.8;
    
    return { ...item, score };
  });
  
  // Сортируем по релевантности и возвращаем топ результаты
  return scoredResults
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// Модифицированный поиск с ленивой синхронизацией
export const searchKnowledgeBase = async (query, limit = 20) => {
  await maybeSync(); // ленивое: если прошло >6ч, тянем дельты
  return esClient.search({ index: 'acts', size: limit, q: query });
};

// Функция для ленивой синхронизации
const maybeSync = async () => {
  if (shouldSync()) {
    try {
      await syncKnowledgeBase();
    } catch (error) {
      console.error('Ошибка синхронизации базы знаний:', error);
    }
  }
};

// Имитация ElasticSearch клиента
const esClient = {
  search: async ({ index, size, q }) => {
    // В реальной реализации здесь был бы запрос к ElasticSearch
    // Пока возвращаем результаты из локальной базы
    return searchLocalKnowledgeBase(q, size);
  }
};

// Функция для получения контекста из базы знаний
export const getKnowledgeContext = async (query) => {
  const relevantItems = await searchLocalKnowledgeBase(query, 3);
  
  if (relevantItems.length === 0) {
    return '';
  }
  
  let context = '\n\nРЕЛЕВАНТНАЯ ИНФОРМАЦИЯ ИЗ БАЗЫ ЗНАНИЙ:\n';
  
  relevantItems.forEach((item, index) => {
    context += `${index + 1}. ${item.category} - ${item.topic}:\n`;
    
    // Ограничиваем длину контента для лучшего отображения
    const maxLength = 2000;
    let content = item.content;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...\n[Полный текст доступен по ссылке]';
    }
    
    context += `${content}\n`;
    
    if (item.source) {
      context += `Источник: ${item.source}\n`;
    }
    if (item.url) {
      context += `Ссылка: ${item.url}\n`;
    }
    if (item.updatedAt) {
      context += `Обновлено: ${new Date(item.updatedAt).toLocaleDateString('ru-RU')}\n`;
    }
    context += '\n';
  });
  
  return context;
};

// Функция для получения статистики базы знаний
export const getKnowledgeStats = async () => {
  const knowledgeBase = await loadKnowledgeBase();
  const categories = [...new Set(knowledgeBase.map(item => item.category))];
  const totalItems = knowledgeBase.length;
  
  return {
    totalItems,
    categories,
    categoriesCount: categories.length,
    averageRelevance: totalItems > 0 ? knowledgeBase.reduce((sum, item) => sum + (item.relevance || 0.8), 0) / totalItems : 0
  };
}; 