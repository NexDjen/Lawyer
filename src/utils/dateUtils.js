// Форматирование времени
export const formatTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const messageDate = new Date(date);
  const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'только что';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} мин назад`;
  } else if (diffInMinutes < 1440) { // 24 часа
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} ч назад`;
  } else {
    return messageDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Форматирование даты для отображения
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return new Date(date).toLocaleDateString('ru-RU', defaultOptions);
};

// Проверка, является ли дата сегодняшней
export const isToday = (date) => {
  if (!date) return false;
  
  const today = new Date();
  const checkDate = new Date(date);
  
  return today.toDateString() === checkDate.toDateString();
};

// Проверка, является ли дата вчерашней
export const isYesterday = (date) => {
  if (!date) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const checkDate = new Date(date);
  
  return yesterday.toDateString() === checkDate.toDateString();
};

// Получение относительного времени
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  if (isToday(date)) {
    return 'Сегодня';
  } else if (isYesterday(date)) {
    return 'Вчера';
  } else {
    return formatDate(date, { month: 'short', day: 'numeric' });
  }
};

// Форматирование длительности
export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds}с`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}м ${remainingSeconds}с`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}ч ${minutes}м`;
  }
};

// Получение временной метки
export const getTimestamp = () => {
  return new Date().toISOString();
};

// Парсинг ISO строки даты
export const parseISODate = (isoString) => {
  try {
    return new Date(isoString);
  } catch (error) {
    console.error('Ошибка при парсинге даты:', error);
    return new Date();
  }
}; 