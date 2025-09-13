// Константы для типов документов
export const DOCUMENT_TYPES = {
  CONTRACT: 'contract',
  COMPLAINT: 'complaint',
  APPLICATION: 'application',
  AGREEMENT: 'agreement',
  STATEMENT: 'statement'
};

// Константы для статусов документов
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Валидация файлов
export const validateFile = (file) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Неподдерживаемый тип файла');
  }

  if (file.size > maxSize) {
    throw new Error('Файл слишком большой (максимум 50MB)');
  }

  return true;
};

// Извлечение текста из файла
export const extractTextFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        resolve(text);
      } catch (error) {
        reject(new Error('Ошибка при чтении файла'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Ошибка при чтении файла'));
    };

    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
};

// Форматирование размера файла
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Определение типа документа по содержимому
export const detectDocumentType = (text) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('договор') || lowerText.includes('contract')) {
    return DOCUMENT_TYPES.CONTRACT;
  }
  
  if (lowerText.includes('жалоба') || lowerText.includes('complaint')) {
    return DOCUMENT_TYPES.COMPLAINT;
  }
  
  if (lowerText.includes('заявление') || lowerText.includes('application')) {
    return DOCUMENT_TYPES.APPLICATION;
  }
  
  if (lowerText.includes('соглашение') || lowerText.includes('agreement')) {
    return DOCUMENT_TYPES.AGREEMENT;
  }
  
  return DOCUMENT_TYPES.STATEMENT;
};

// Генерация уникального имени файла
export const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
};

// Создание объекта документа
export const createDocumentObject = (file, extractedText = '') => {
  const documentType = detectDocumentType(extractedText);
  
  return {
    id: Date.now(),
    name: file.name,
    size: file.size,
    type: file.type,
    documentType,
    status: DOCUMENT_STATUS.DRAFT,
    content: extractedText,
    uploadedAt: new Date(),
    lastModified: new Date()
  };
}; 