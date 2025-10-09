/**
 * Константы для модуля чата
 */

// Типы сообщений
export const MESSAGE_TYPES = {
  USER: 'user',
  BOT: 'bot',
  SYSTEM: 'system'
};

// Статусы API
export const API_STATUS = {
  CONNECTED: 'connected',
  ERROR: 'error',
  LOADING: 'loading',
  IDLE: 'idle'
};

// Лимиты
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_HISTORY_LENGTH: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  FREE_DAILY_MESSAGES: 10,
  MIN_MESSAGE_LENGTH: 1
};

// Настройки TTS
export const TTS_CONFIG = {
  DEFAULT_VOICE: 'nova',
  DEFAULT_MODEL: 'tts-1',
  DEFAULT_RATE: 0.9,
  DEFAULT_PITCH: 1.0,
  DEFAULT_VOLUME: 1.0,
  LANGUAGE: 'ru-RU'
};

// Настройки textarea
export const TEXTAREA_CONFIG = {
  MIN_HEIGHT: 40,
  MAX_HEIGHT: 200,
  PLACEHOLDER: 'Задайте вопрос Галине...',
  ROWS: 1
};

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  EMPTY_MESSAGE: 'Сообщение не может быть пустым',
  MESSAGE_TOO_LONG: `Сообщение слишком длинное (максимум ${LIMITS.MAX_MESSAGE_LENGTH} символов)`,
  FILE_TOO_LARGE: 'Файл слишком большой',
  INVALID_FILE_TYPE: 'Неподдерживаемый тип файла',
  API_ERROR: 'Ошибка при обработке запроса',
  NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету',
  TTS_ERROR: 'Ошибка синтеза речи',
  TRANSCRIPTION_ERROR: 'Ошибка транскрибации аудио',
  DAILY_LIMIT_REACHED: 'Вы исчерпали лимит бесплатных сообщений на сегодня'
};

// Подсказки для пользователя
export const SUGGESTIONS = [
  'Проверь договор аренды: риски и рекомендации',
  'Подскажи, как составить претензию по возврату денег',
  'Какие пункты добавить в договор оказания услуг?',
  'Разбери трудовой договор: права и обязанности сторон'
];

// Приветственное сообщение
export const WELCOME_MESSAGE = {
  title: 'Добро пожаловать! 👋',
  description: 'Я Галина, ваш ИИ-юрист. Задайте мне любой юридический вопрос, и я помогу вам разобраться в ситуации.'
};

// Сообщение о загрузке
export const LOADING_MESSAGE = 'Галина думает...';

// Форматы файлов
export const SUPPORTED_FILE_TYPES = {
  DOCUMENT: ['.pdf', '.doc', '.docx', '.txt'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  AUDIO: ['.mp3', '.wav', '.m4a', '.webm', '.mp4']
};

// Regex для валидации
export const VALIDATION_REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/,
  URL: /(https?:\/\/[^\s)]+)(\)?)/g
};

const chatConstants = {
  MESSAGE_TYPES,
  API_STATUS,
  LIMITS,
  TTS_CONFIG,
  TEXTAREA_CONFIG,
  ERROR_MESSAGES,
  SUGGESTIONS,
  WELCOME_MESSAGE,
  LOADING_MESSAGE,
  SUPPORTED_FILE_TYPES,
  VALIDATION_REGEX
};

export default chatConstants;

