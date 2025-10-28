import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, X, Camera, FileText, Edit3, Save, RotateCcw, Brain, Loader, Trash2 } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import './DocumentUpload.css';

const DocumentUpload = ({ onTextExtracted, onClose, documentType = null, storageKey = 'documents', profileDefaults = {} }) => {
  const { updateCurrentUser, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  // State for multiple image carousel
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [showBatchAnalysis, setShowBatchAnalysis] = useState(false);
  const [isProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedFields, setEditedFields] = useState({});
  const [showRawText, setShowRawText] = useState(false);

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

  // Функции перевода
  const translateSeverity = (severity) => {
    switch (severity) {
      case 'critical': return 'Критический';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return severity;
    }
  };

  const translatePriority = (priority) => {
    switch (priority) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return priority;
    }
  };
  const fileInputRef = useRef(null);
  const cameraRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastUploadMeta, setLastUploadMeta] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const progressTimerRef = useRef(null);
  const controllerRef = useRef(null);
  const pendingIdRef = useRef(null);
  const progressValueRef = useRef(0);
  const xhrRef = useRef(null);

  const applyExtractedToProfile = (fields) => {
    try {
      if (!documentType || !documentType.id || !fields) return;
      const updates = {};
      if (documentType.id === 'passport') {
        if (!user?.lastName && fields.lastName) updates.lastName = fields.lastName;
        if (!user?.firstName && fields.firstName) updates.firstName = fields.firstName;
        if (!user?.middleName && fields.middleName) updates.middleName = fields.middleName;
        if (!user?.birthDate && fields.birthDate) updates.birthDate = fields.birthDate;
        if (!user?.passportSeries && fields.series) updates.passportSeries = fields.series;
        if (!user?.passportNumber && fields.number) updates.passportNumber = fields.number;
        const inferredFullName = [fields.lastName, fields.firstName, fields.middleName].filter(Boolean).join(' ').trim();
        if (!user?.fullName && inferredFullName) updates.fullName = inferredFullName;
      } else if (documentType.id === 'snils') {
        if (!user?.snils && fields.number) updates.snils = fields.number;
        if (!user?.lastName && fields.lastName) updates.lastName = fields.lastName;
        if (!user?.firstName && fields.firstName) updates.firstName = fields.firstName;
        if (!user?.middleName && fields.middleName) updates.middleName = fields.middleName;
        const inferredFullName = [fields.lastName, fields.firstName, fields.middleName].filter(Boolean).join(' ').trim();
        if (!user?.fullName && inferredFullName) updates.fullName = inferredFullName;
      }
      if (Object.keys(updates).length > 0) {
        updateCurrentUser(updates);
      }
    } catch (_) {}
  };

  // Проверка поддержки камеры/безопасного контекста (для мобильных нужно HTTPS)
  const isSecureContext = typeof window !== 'undefined'
    ? (window.isSecureContext || window.location.protocol === 'https:' || ['localhost','127.0.0.1'].includes(window.location.hostname))
    : false;
  const isMediaDevicesSupported = typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

  const upsertDocumentInStorage = (predicate, updater, fallbackNewDoc) => {
    try {
      const docs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const idx = docs.findIndex(predicate);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], ...updater(docs[idx]) };
      } else if (fallbackNewDoc) {
        docs.unshift(fallbackNewDoc);
      }
      
      // Ограничиваем количество документов в localStorage (максимум 50)
      if (docs.length > 50) {
        docs.splice(50); // Удаляем старые документы
        console.warn('LocalStorage quota exceeded, removed old documents');
      }
      
      localStorage.setItem(storageKey, JSON.stringify(docs));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old documents');
        // Очищаем старые документы и пробуем снова
        try {
          const docs = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const originalCount = docs.length;
          // Оставляем только последние 20 документов
          const recentDocs = docs.slice(0, 20);
          localStorage.setItem(storageKey, JSON.stringify(recentDocs));
          
          // Пробуем добавить новый документ
          if (fallbackNewDoc) {
            recentDocs.unshift(fallbackNewDoc);
            localStorage.setItem(storageKey, JSON.stringify(recentDocs));
          }
          
          // Показываем уведомление пользователю
          console.log(`Auto-cleared ${originalCount - recentDocs.length} old documents due to storage limit`);
        } catch (retryError) {
          console.error('Failed to save document to localStorage:', retryError);
          // Если и это не помогло, очищаем все
          localStorage.removeItem(storageKey);
          alert('Память браузера переполнена. Все документы очищены. Попробуйте загрузить документ снова.');
        }
      } else {
        console.error('Error saving document to localStorage:', error);
      }
    }
  };


  // Определяем поля для разных типов документов
  const getDocumentFields = (type) => {
    const fieldConfigs = {
      passport: {
        series: { label: 'Серия', placeholder: '0000' },
        number: { label: 'Номер', placeholder: '000000' },
        firstName: { label: 'Имя', placeholder: 'Иван' },
        lastName: { label: 'Фамилия', placeholder: 'Иванов' },
        middleName: { label: 'Отчество', placeholder: 'Иванович' },
        birthDate: { label: 'Дата рождения', placeholder: '01.01.1990' },
        birthPlace: { label: 'Место рождения', placeholder: 'г. Москва' },
        issueDate: { label: 'Дата выдачи', placeholder: '01.01.2020' },
        issuedBy: { label: 'Кем выдан', placeholder: 'УФМС России' }
      },
      snils: {
        number: { label: 'Номер СНИЛС', placeholder: '000-000-000 00' },
        firstName: { label: 'Имя', placeholder: 'Иван' },
        lastName: { label: 'Фамилия', placeholder: 'Иванов' },
        middleName: { label: 'Отчество', placeholder: 'Иванович' },
        registrationDate: { label: 'Дата регистрации', placeholder: '01.01.2020' }
      },
      license: {
        series: { label: 'Серия', placeholder: '00 АА' },
        number: { label: 'Номер', placeholder: '000000' },
        firstName: { label: 'Имя', placeholder: 'Иван' },
        lastName: { label: 'Фамилия', placeholder: 'Иванов' },
        middleName: { label: 'Отчество', placeholder: 'Иванович' },
        birthDate: { label: 'Дата рождения', placeholder: '01.01.1990' },
        categories: { label: 'Категории', placeholder: 'B, C' },
        issueDate: { label: 'Дата выдачи', placeholder: '01.01.2020' },
        expiryDate: { label: 'Дата окончания', placeholder: '01.01.2030' }
      },
      birth: {
        series: { label: 'Серия', placeholder: 'I-АА' },
        number: { label: 'Номер', placeholder: '000000' },
        childName: { label: 'Имя ребенка', placeholder: 'Иван' },
        childLastName: { label: 'Фамилия ребенка', placeholder: 'Иванов' },
        childMiddleName: { label: 'Отчество ребенка', placeholder: 'Иванович' },
        birthDate: { label: 'Дата рождения', placeholder: '01.01.2020' },
        birthPlace: { label: 'Место рождения', placeholder: 'г. Москва' },
        fatherName: { label: 'Имя отца', placeholder: 'Иван Иванович' },
        motherName: { label: 'Имя матери', placeholder: 'Мария Ивановна' }
      }
    };
    return fieldConfigs[type] || {};
  };

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
        handleFileUpload(file, isBatchMode);
      }
    });
  };

  const handleFileUpload = async (file, isBatchMode = false) => {
    // Проверяем размер файла на клиенте (50GB лимит)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB - практически без ограничений
    if (file.size > MAX_FILE_SIZE) {
      alert(`Файл слишком большой. Максимальный размер: ${formatSize(MAX_FILE_SIZE)}. Размер вашего файла: ${formatSize(file.size)}`);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setProgressStage('Подготовка файла...');
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    
    // Имитация прогресса с этапами обработки
    let stageIndex = 0;
    const stages = [
      { text: 'Подготовка файла...', max: 20 },
      { text: 'Отправка на сервер...', max: 45 },
      { text: 'Обработка изображения...', max: 70 },
      { text: 'Анализ документа...', max: 90 }
    ];
    
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const currentStage = stages[stageIndex];
        const increment = currentStage.max / 20; // Плавное заполнение этапа
        const next = Math.min(prev + increment, currentStage.max);
        
        // Переход к следующему этапу
        if (next >= currentStage.max && stageIndex < stages.length - 1) {
          stageIndex++;
          setProgressStage(stages[stageIndex].text);
        }
        
        progressValueRef.current = next;
        const clientId = pendingIdRef.current;
        if (clientId) {
          try {
            upsertDocumentInStorage(
              (d) => d.id === clientId,
              () => ({ progress: next })
            );
          } catch (_) {}
        }
        return next;
      });
    }, 200);
    
    try {
      // Создаём карточку в списке документов со статусом "processing"
      const clientId = `tmp_${Date.now()}`;
      pendingIdRef.current = clientId;
      const isPdfLocal = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      
      // Сохраняем оригинальное имя файла
      setOriginalFileName(file.name);
      
      const newDoc = {
        id: clientId,
        name: file.name || (isPdfLocal ? 'PDF документ' : (documentType?.name || 'Документ')),
        content: '',
        uploadedAt: new Date().toISOString(),
        type: isPdfLocal ? 'pdf' : (documentType?.id || 'legal'),
        status: 'processing',
        size: formatSize(file.size || 0),
        progress: 0
      };
      upsertDocumentInStorage(() => false, () => ({}), newDoc);

      const formData = new FormData();
      formData.append('document', file);
      
      // Добавляем тип документа в FormData
      if (documentType && documentType.id) {
        formData.append('documentType', documentType.id);
      }
      
      // PDF: не читаем целиком в память
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Add new image to carousel and keep single-image state for compatibility
          setUploadedImages(prev => [...prev, e.target.result]);
          setUploadedImage(e.target.result);
          setCurrentIndex(0);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedImage(null);
      }

      // Отправляем на сервер для OCR
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      const endpoint = buildApiUrl('documents/ocr');
      xhr.open('POST', endpoint, true);
      xhr.timeout = 180000; // 3 минуты таймаут для OCR
      // upload progress (реальный прогресс отправки файла)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.max(35, Math.min(60, Math.round((e.loaded / e.total) * 25) + 35));
          setProgress(percent);
          setProgressStage('Отправка на сервер...');
          progressValueRef.current = percent;
          const clientId = pendingIdRef.current;
          if (clientId) {
            upsertDocumentInStorage((d) => d.id === clientId, () => ({ progress: percent }));
          }
        }
      };
      // download progress (небольшой докачки ответа)
      xhr.onprogress = () => {
        const bump = Math.min(95, Math.max(progressValueRef.current, 92));
        setProgress(bump);
        setProgressStage('Получение результата...');
        progressValueRef.current = bump;
        const clientId = pendingIdRef.current;
        if (clientId) {
          upsertDocumentInStorage((d) => d.id === clientId, () => ({ progress: bump }));
        }
      };
      const responsePromise = new Promise((resolve, reject) => {
        xhr.ontimeout = () => {
          reject(new Error('Превышено время ожидания OCR (3 минуты). Проверьте соединение и попробуйте снова.'));
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                resolve(result);
              } catch (err) {
                reject(err);
              }
            } else {
              // Улучшаем сообщение об ошибке: парсим тело ответа, если возможно
              try {
                const text = xhr.responseText || '';
                let details = '';
                if (text) {
                  try {
                    const json = JSON.parse(text);
                    details = json.details || json.error || text;
                  } catch (_) {
                    details = text;
                  }
                }
                
                // Специальная обработка ошибки 413
                if (xhr.status === 413) {
                  reject(new Error('Файл слишком большой для загрузки. Пожалуйста, выберите файл меньшего размера или обратитесь к администратору для настройки сервера.'));
                } else {
                  reject(new Error(details || 'Ошибка при обработке документа'));
                }
              } catch (_) {
                reject(new Error('Ошибка при обработке документа'));
              }
            }
          }
        };
        xhr.onerror = () => reject(new Error('Ошибка сети при загрузке документа'));
        xhr.onabort = () => reject(Object.assign(new Error('Загрузка отменена'), { name: 'AbortError' }));
      });

      xhr.send(formData);
      const result = await responsePromise;
      setLastUploadMeta({ filename: file.name, sizeBytes: file.size, isPdf, id: result.id, expiresAt: result.expiresAt });
      setOcrResult(result);
      // Заполняем профиль пользователя распознанными полями (только пустые поля)
      if (result && result.extractedData) {
        applyExtractedToProfile(result.extractedData);
      }
      
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
        const documentData = {
          fileName: file.name,
          extractedText: result.recognizedText,
          documentType: 'legal',
          uploadedAt: new Date().toISOString(),
          isPdf: isPdf
        };
        setUploadedDocuments(prev => [...prev, documentData]);
      }
      // Обновляем карточку документа из background
      upsertDocumentInStorage(
        (d) => d.id === clientId,
        (d) => ({
          status: isPdfLocal ? 'uploaded' : 'analyzed',
          content: isPdf
            ? (result?.recognizedText || `PDF: ${file.name || ''} (истекает: ${result?.expiresAt || ''})`)
            : (result?.recognizedText || ''),
          analysis: result?.analysis || null,
          progress: 100,
          size: isPdf ? formatSize(file.size || 0) : `${((result?.recognizedText || '').length / 1024).toFixed(1)} KB`
        })
      );
      
      // Инициализируем поля для редактирования только если это изображение
      if (!isPdf && documentType) {
        const fields = getDocumentFields(documentType.id);
        const initialFields = {};
        const mapProfileValue = (key) => {
          const d = profileDefaults || {};
          switch (key) {
            case 'firstName': return d.firstName || '';
            case 'lastName': return d.lastName || '';
            case 'middleName': return d.middleName || '';
            case 'birthDate': return d.birthDate || '';
            case 'issuedBy': return '';
            case 'issueDate': return '';
            case 'series':
              if (documentType.id === 'passport') return d.passportSeries || '';
              return '';
            case 'number':
              if (documentType.id === 'passport') return d.passportNumber || '';
              if (documentType.id === 'snils') return d.snils || '';
              return '';
            default:
              return '';
          }
        };
        Object.keys(fields).forEach(key => {
          // Пробуем прямое совпадение
          let value = result.extractedData?.[key];
          if (!value) {
            // Фоллбэки для названий полей из OCR
            switch (key) {
              case 'firstName':
                value = result.extractedData?.name;
                break;
              case 'lastName':
                value = result.extractedData?.surname;
                break;
              case 'middleName':
                value = result.extractedData?.patronymic;
                break;
              case 'birthDate':
                value = result.extractedData?.birthDate || result.extractedData?.date_of_birth;
                break;
              case 'birthPlace':
                value = result.extractedData?.birthPlace || result.extractedData?.place_of_birth;
                break;
              case 'issueDate':
                value = result.extractedData?.issueDate || result.extractedData?.date_of_issue;
                break;
              case 'issuedBy':
                value = result.extractedData?.issuedBy || result.extractedData?.issuing_authority;
                break;
              case 'number':
                value = result.extractedData?.number || result.extractedData?.passport_number;
                break;
              case 'series':
                value = result.extractedData?.series || '';
                break;
              default:
                // Для неизвестных ключей оставляем value как есть
                break;
            }
          }
          initialFields[key] = value || mapProfileValue(key) || '';
        });
        setEditedFields(initialFields);
      }
      
      // если бэкенд вернул analysis, прокинем его наверх через onTextExtracted вторым аргументом
      if (result.analysis) {
        setOcrResult(prev => ({ ...(prev || {}), analysis: result.analysis }));
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      // Помечаем карточку как error, если не отмена
      const clientId = pendingIdRef.current;
      const isAbort = error?.name === 'AbortError';
      upsertDocumentInStorage(
        (d) => d.id === clientId,
        (d) => ({ status: isAbort ? 'canceled' : 'error', progress: 0 })
      );
      if (!isAbort) {
        const errorMessage = error?.response?.data?.details || error?.message || 'Неизвестная ошибка';
        alert(`Ошибка при загрузке документа: ${errorMessage}`);
      }
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgress(100);
      setProgressStage('Завершено!');
      progressValueRef.current = 100;
      setIsUploading(false);
      setTimeout(() => {
        setProgress(0);
        setProgressStage('');
      }, 800);
    }
  };

  const handleCameraCapture = () => {
    if (cameraRef.current) {
      const canvas = document.createElement('canvas');
      const video = cameraRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        handleFileUpload(file);
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    try {
      const stream = mediaStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      mediaStreamRef.current = null;
      setIsCameraReady(false);
    } catch (_) {}
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!isMediaDevicesSupported) {
        throw new Error('Камера не поддерживается в этом браузере/устройстве');
      }
      if (!isSecureContext) {
        throw new Error('Съёмка доступна только через защищённое соединение (HTTPS). Пожалуйста, откройте сайт по HTTPS или загрузите фото из галереи.');
      }
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        cameraRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
          cameraRef.current.play().catch(() => {});
        };
      }
    } catch (err) {
      setCameraError(err?.message || 'Не удалось получить доступ к камере');
    }
  };

  useEffect(() => {
    if (isEditing && !uploadedImage) {
      if (isMediaDevicesSupported && isSecureContext) {
        startCamera();
      } else {
        // Покажем понятную ошибку и не будем пытаться запускать
        if (!isMediaDevicesSupported) setCameraError('Камера не поддерживается в этом браузере. Загрузите фото файла.');
        else if (!isSecureContext) setCameraError('Для съёмки нужен HTTPS. Загрузите фото или откройте сайт по HTTPS.');
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, uploadedImage]);

  const handleFieldChange = (fieldName, value) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const formatSize = (bytes = 0) => {
    if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const handleSaveDocument = async () => {
    setIsSaving(true);
    console.log('🔄 Начинаем сохранение документа...');
    console.log('📊 Данные для сохранения:', {
      lastUploadMeta,
      ocrResult,
      analysisResult,
      uploadedImage: !!uploadedImage,
      editedFields,
      documentType,
      uploadedDocuments: uploadedDocuments.length
    });

    try {
      // Проверяем, есть ли групповой анализ
      const isBatchAnalysis = uploadedDocuments.length > 1 && analysisResult;
      
      const isPdf = !!(lastUploadMeta?.isPdf || (ocrResult && ocrResult.kind === 'pdf'));
      
      let documentData;
      let filename;
      let documentTypeForSave;
      
      if (isBatchAnalysis) {
        // Сохраняем групповой анализ как один документ
        documentData = {
          type: 'batch',
          isBatch: true,
          documentCount: uploadedDocuments.length,
          documents: uploadedDocuments.map(doc => ({
            fileName: doc.fileName,
            extractedText: doc.extractedText,
            uploadedAt: doc.uploadedAt
          })),
          analysis: analysisResult,
          batchId: analysisResult.batchId || `batch_${Date.now()}`
        };
        filename = `Пакет документов (${uploadedDocuments.length})`;
        documentTypeForSave = 'batch';
      } else {
        // Обычное сохранение одного документа
        documentData = isPdf
          ? {
              type: 'pdf',
              filename: lastUploadMeta?.filename,
              id: lastUploadMeta?.id,
              expiresAt: lastUploadMeta?.expiresAt,
              recognizedText: ocrResult?.recognizedText,
              extractedData: ocrResult?.extractedData,
              confidence: ocrResult?.confidence,
              analysis: ocrResult?.analysis || analysisResult || null
            }
          : { 
              type: documentType?.id || 'unknown', 
              fields: editedFields, 
              image: uploadedImage, 
              ocrResult: ocrResult,
              analysis: analysisResult || null
            };
        filename = isPdf ? (lastUploadMeta?.filename || originalFileName || 'PDF документ') : (originalFileName || documentType?.name || 'Документ');
        documentTypeForSave = isPdf ? 'pdf' : (documentType?.id || 'unknown');
      }

      // При сохранении изображения — обновим профиль из вручную откорректированных полей
      if (!isPdf && documentType && editedFields) {
        applyExtractedToProfile(editedFields);
      }

      // Try to save to database first
      try {
        const userId = user?.id || 'current-user';
        const dbDocumentData = {
          filename: filename,
          originalName: filename,
          filePath: isPdf ? (lastUploadMeta?.filePath || '') : '',
          fileSize: isPdf ? (lastUploadMeta?.sizeBytes || 0) : (uploadedImage?.length || 0),
          mimeType: isPdf ? 'application/pdf' : (isBatchAnalysis ? 'application/batch' : 'image/jpeg'),
          documentType: documentTypeForSave,
          extractedText: isBatchAnalysis 
            ? uploadedDocuments.map(doc => `${doc.fileName}: ${doc.extractedText}`).join('\n\n')
            : (isPdf ? (ocrResult?.recognizedText || '') : (ocrResult?.parsedData?.extractedText || ocrResult?.extractedText || '')),
          ocrConfidence: ocrResult?.confidence || 0,
          analysisResult: analysisResult || ocrResult?.parsedData?.analysis || ocrResult?.analysis || null,
          imageBase64: !isPdf && !isBatchAnalysis ? uploadedImage : null,
          isBatch: isBatchAnalysis,
          batchId: isBatchAnalysis ? (analysisResult.batchId || `batch_${Date.now()}`) : null,
          documentCount: isBatchAnalysis ? uploadedDocuments.length : 1
        };

        console.log('💾 Сохраняем документ в базу данных...', {
          extractedTextLength: dbDocumentData.extractedText?.length || 0,
          extractedTextPreview: dbDocumentData.extractedText?.substring(0, 100) || 'empty',
          ocrResult: ocrResult ? 'has ocrResult' : 'no ocrResult'
        });
        const response = await fetch(buildApiUrl('documents/save'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            documentData: dbDocumentData
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Документ успешно сохранен в базу данных:', result.data);
        } else {
          throw new Error('Database save failed');
        }
      } catch (dbError) {
        console.warn('⚠️ Ошибка сохранения в базу данных, используем localStorage:', dbError);
        
        // Fallback to localStorage
        try {
          const savedDocuments = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const newDocument = {
            id: Date.now(),
            name: filename,
            content: isBatchAnalysis 
              ? `Пакет из ${uploadedDocuments.length} документов:\n${uploadedDocuments.map(doc => `• ${doc.fileName}`).join('\n')}`
              : (isPdf
                ? (ocrResult?.recognizedText || `PDF: ${lastUploadMeta?.filename || ''} (истекает: ${lastUploadMeta?.expiresAt || ''})`)
                : JSON.stringify(documentData)),
            uploadedAt: new Date().toISOString(),
            type: documentTypeForSave,
            status: isPdf ? 'uploaded' : 'analyzed',
            size: isPdf ? formatSize(lastUploadMeta?.sizeBytes || 0) : (isBatchAnalysis ? `${uploadedDocuments.length} документов` : `${(uploadedImage?.length || 0) / 1024} KB`),
            analysis: analysisResult || ocrResult?.analysis || null,
            isBatch: isBatchAnalysis,
            batchId: isBatchAnalysis ? (analysisResult.batchId || `batch_${Date.now()}`) : null,
            documentCount: isBatchAnalysis ? uploadedDocuments.length : 1
          };

          console.log('💾 Сохраняем документ в localStorage:', newDocument);

          savedDocuments.unshift(newDocument);
          
          // Ограничиваем количество документов в localStorage (максимум 50)
          if (savedDocuments.length > 50) {
            savedDocuments.splice(50); // Удаляем старые документы
            console.warn('LocalStorage quota exceeded, removed old documents');
          }
          
          localStorage.setItem(storageKey, JSON.stringify(savedDocuments));
          console.log('✅ Документ успешно сохранен в localStorage');
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded, clearing old documents');
            try {
              // Очищаем старые документы и пробуем снова
              const savedDocuments = JSON.parse(localStorage.getItem(storageKey) || '[]');
              const recentDocs = savedDocuments.slice(0, 20); // Оставляем только последние 20
              localStorage.setItem(storageKey, JSON.stringify(recentDocs));
              
              // Пробуем добавить новый документ
              const newDocument = {
                id: Date.now(),
                name: filename,
                content: isBatchAnalysis 
                  ? `Пакет из ${uploadedDocuments.length} документов:\n${uploadedDocuments.map(doc => `• ${doc.fileName}`).join('\n')}`
                  : (isPdf
                    ? (ocrResult?.recognizedText || `PDF: ${lastUploadMeta?.filename || ''} (истекает: ${lastUploadMeta?.expiresAt || ''})`)
                    : JSON.stringify(documentData)),
                uploadedAt: new Date().toISOString(),
                type: documentTypeForSave,
                status: isPdf ? 'uploaded' : 'analyzed',
                size: isPdf ? formatSize(lastUploadMeta?.sizeBytes || 0) : (isBatchAnalysis ? `${uploadedDocuments.length} документов` : `${(uploadedImage?.length || 0) / 1024} KB`),
                analysis: analysisResult || ocrResult?.analysis || null,
                isBatch: isBatchAnalysis,
                batchId: isBatchAnalysis ? (analysisResult.batchId || `batch_${Date.now()}`) : null,
                documentCount: isBatchAnalysis ? uploadedDocuments.length : 1
              };
              
              recentDocs.unshift(newDocument);
              localStorage.setItem(storageKey, JSON.stringify(recentDocs));
              console.log('✅ Документ сохранен после очистки localStorage');
            } catch (retryError) {
              console.error('Failed to save document to localStorage after cleanup:', retryError);
              alert('Память браузера переполнена. Документ не может быть сохранен локально.');
            }
          } else {
            console.error('Error saving document to localStorage:', error);
            alert('Ошибка сохранения документа в память браузера.');
          }
        }
      }

      // Для PDF пробрасываем чистый текст, чтобы карточка не показывала JSON
      const textToEmit = isBatchAnalysis 
        ? `Пакет из ${uploadedDocuments.length} документов:\n${uploadedDocuments.map(doc => `• ${doc.fileName}`).join('\n')}`
        : (isPdf ? (ocrResult?.recognizedText || '') : JSON.stringify(documentData));
      onTextExtracted(textToEmit, filename);
      
      console.log('🎉 Сохранение завершено, закрываем модал');
      onClose();
    } catch (error) {
      console.error('❌ Ошибка при сохранении документа:', error);
      alert('Ошибка при сохранении документа: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetakePhoto = () => {
    setUploadedImage(null);
    // Clear carousel images
    setUploadedImages([]);
    setCurrentIndex(0);
    setOcrResult(null);
    setEditedFields({});
    setIsEditing(false);
    setAnalysisResult(null);
  };

  const handleBatchAnalysis = async () => {
    // Guard against multiple triggers
    if (isAnalyzing) {
      console.warn('⚠️ Batch analysis already in progress, skipping duplicate trigger');
      return;
    }
    
    if (uploadedDocuments.length < 2) {
      // Убираем всплывающее уведомление о необходимости минимум 2 документов
      return;
    }

    try {
      const result = await performBatchLLMAnalysis(uploadedDocuments);
      // console.log('Групповой анализ завершен:', result);
      // Убираем всплывающее уведомление о завершении группового анализа
    } catch (error) {
      console.error('Ошибка группового анализа:', error);
      // Убираем всплывающее уведомление об ошибке группового анализа
    }
  };

  const performBatchLLMAnalysis = async (documents) => {
    try {
      setIsAnalyzing(true);
      setProgress(0);
      setProgressStage('⏳ Подготовка документов...');
      
      // STEP 1: Preparing documents
      setProgress(10);
      setProgressStage('📄 Собираю информацию о всех документах...');
      await new Promise(res => setTimeout(res, 500)); // Small delay for visual feedback

      // STEP 2: Sending to LLM
      setProgress(30);
      setProgressStage('🤖 Отправляю все документы для анализа...');
      
      // Fetch with retries for transient errors
      const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fetch(url, options);
          } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, delay));
          }
        }
      };
      
      const analysisResponse = await fetchWithRetry(
        buildApiUrl('documents/batch-analysis'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documents: documents.map(doc => ({
              documentText: doc.extractedText || doc.recognizedText || '',
              fileName: doc.fileName || doc.name || 'Документ',
              documentType: doc.documentType || 'legal'
            })),
            userId: '1' 
          })
        }
      );

      setProgress(70);
      setProgressStage('📊 Формирую результаты анализа...');

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('Ошибка группового LLM анализа:', analysisResponse.status, errorText);
        throw new Error(`Ошибка группового анализа документов: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      
      setProgress(90);
      setProgressStage('✨ Завершаю анализ...');
      
      // Set result and progress to complete
      if (analysisData.data) {
        setAnalysisResult(analysisData.data);
      }
      
      setProgress(100);
      setProgressStage('✅ Анализ завершен! Готово к просмотру.');
      
      // Keep showing result for 2 seconds before closing
      await new Promise(res => setTimeout(res, 2000));
      
      return analysisData.data;
    } catch (error) {
      console.error('Ошибка при групповом LLM анализе:', error);
      setProgressStage('❌ Ошибка при анализе: ' + error.message);
      setProgress(0);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performLLMAnalysis = async (documentText, fileName) => {
    try {
      setIsAnalyzing(true);
      setProgressStage('🤔 Изучаю документ и анализирую его содержание...');
      setProgress(85);
      // console.log('Начинаем LLM анализ документа:', fileName);
      
      // Fetch with retries for transient errors
      const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fetch(url, options);
          } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, delay));
          }
        }
      };
      const analysisResponse = await fetchWithRetry(
        buildApiUrl('documents/advanced-analysis'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentText, documentType: 'legal', fileName, userId: '1' })
        }
      );

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('Ошибка LLM анализа:', analysisResponse.status, errorText);
        throw new Error(`Ошибка анализа документа: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      // console.log('LLM анализ завершен:', analysisData);
      setAnalysisResult(analysisData);
      setProgress(100);
      
      // Сохраняем результат анализа в localStorage для последующего отображения
      const docId = analysisData.data?.metadata?.docId;
      if (docId) {
        try {
          localStorage.setItem(`analysis_${docId}`, JSON.stringify({
            docId,
            timestamp: new Date().toISOString(),
            analysis: analysisData.data,
            fileName: fileName
          }));
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded for analysis data, skipping save');
            // Очищаем старые анализы
            try {
              const keys = Object.keys(localStorage);
              const analysisKeys = keys.filter(key => key.startsWith('analysis_'));
              // Удаляем половину старых анализов
              analysisKeys.slice(0, Math.floor(analysisKeys.length / 2)).forEach(key => {
                localStorage.removeItem(key);
              });
              // Пробуем снова
              localStorage.setItem(`analysis_${docId}`, JSON.stringify({
                docId,
                timestamp: new Date().toISOString(),
                analysis: analysisData.data,
                fileName: fileName
              }));
            } catch (retryError) {
              console.error('Failed to save analysis after cleanup:', retryError);
            }
          } else {
            console.error('Error saving analysis to localStorage:', error);
          }
        }
      }
      
    } catch (error) {
      console.error('Ошибка LLM анализа:', error);
      setProgressStage('❌ Произошла ошибка при анализе');
      // Продолжаем, даже если анализ не удался
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fields = documentType ? getDocumentFields(documentType.id) : {};

  // Функция для очистки localStorage при превышении квоты
  const clearOldDocuments = () => {
    try {
      const docs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const originalCount = docs.length;
      // Оставляем только последние 10 документов
      const recentDocs = docs.slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(recentDocs));
      console.log(`Cleared ${originalCount - recentDocs.length} old documents from localStorage`);
      
      // Показываем уведомление пользователю
      alert(`Очищено ${originalCount - recentDocs.length} старых документов из памяти браузера. Осталось ${recentDocs.length} документов.`);
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      alert('Ошибка при очистке памяти браузера. Попробуйте перезагрузить страницу.');
      return false;
    }
  };

  return (
    <div className="document-upload-modal">
      <div className="document-upload-overlay" onClick={onClose}></div>
      <div className="document-upload-content">
        <div className="document-upload-header">
          <h2>
            {documentType ? `Загрузка ${documentType.name}` : 'Загрузка документа'}
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
      </div>

        <div className="document-upload-body">
          {!uploadedImage && !ocrResult ? (
            <div className="upload-section">
              <div className="upload-area">
                <Upload size={48} />
                <h3>Загрузите изображение или PDF</h3>
                <p>Поддерживаются форматы: JPG, PNG, PDF (без ограничений по размеру)</p>
                
                <div className="upload-buttons">
                  <button 
                    className="upload-btn primary"
        onClick={() => fileInputRef.current?.click()}
      >
                    <FileText size={20} />
                    Выбрать файл
                  </button>
                  
                  <button 
                    className="upload-btn secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Camera size={20} />
                    Сделать фото
                  </button>
                  
                  <button 
                    className="upload-btn danger"
                    onClick={clearOldDocuments}
                    title="Очистить старые документы из памяти браузера"
                  >
                    <Trash2 size={20} />
                    Очистить память
                  </button>
                </div>
                
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
            </div>
          ) : (
            <div className="document-preview-section">
              <div className="preview-header">
                <h3>Предварительный просмотр</h3>
                <button 
                  className="retake-btn"
                  onClick={handleRetakePhoto}
                >
                  <RotateCcw size={16} />
                  Сделать заново
                </button>
              </div>

              <div className="preview-content">
                <div className="image-preview">
                  {uploadedImages && uploadedImages.length > 0 ? (
                    <div className="image-carousel">
                      <button
                        className="carousel-btn prev"
                        onClick={() => setCurrentIndex((prev) => (prev - 1 + uploadedImages.length) % uploadedImages.length)}
                        aria-label="Предыдущее изображение"
                      >
                        ‹
                      </button>
                      <img src={uploadedImages[currentIndex]} alt={`Загруженный документ ${currentIndex + 1}/${uploadedImages.length}`} />
                      <button
                        className="carousel-btn next"
                        onClick={() => setCurrentIndex((prev) => (prev + 1) % uploadedImages.length)}
                        aria-label="Следующее изображение"
                      >
                        ›
                      </button>
                      <div className="carousel-indicator">
                        {currentIndex + 1} / {uploadedImages.length}
                      </div>
                    </div>
                  ) : (
                    uploadedImage ? (
                      <img src={uploadedImage} alt="Загруженный документ" />
                    ) : (
                      <div style={{padding:16,opacity:0.7}}>Предпросмотр доступен только для изображений</div>
                    )
                  )}
                </div>

                {/* OCR details UI removed by request */}
                
                {/* LLM Анализ результатов */}
                {isAnalyzing && (
                  <div className="analysis-loading">
                    <p>ИИ анализирует документ...</p>
                  </div>
                )}
                
                {analysisResult && (
                  <div className="llm-analysis-container">
                    <div className="analysis-header-new">
                      <h3>📊 Экспертный анализ от Галины</h3>
                      <p className="analysis-subtitle">Профессиональное заключение по документу</p>
                    </div>

                    {/* Экспертное мнение */}
                    <div className="analysis-section expert-opinion-section">
                      <div className="section-header">
                        <span className="section-icon">💼</span>
                        <h4>Экспертное мнение</h4>
                      </div>
                      <div className="section-content">
                        <p className="expert-text">
                          {analysisResult.analysis?.expertOpinion?.overallAssessment ||
                           analysisResult.analysis?.summary?.overallAssessment ||
                           analysisResult.data?.analysis?.expertOpinion?.overallAssessment ||
                           analysisResult.data?.analysis?.summary?.overallAssessment ||
                           analysisResult.data?.expertOpinion?.overallAssessment ||
                           analysisResult.data?.summary?.overallAssessment ||
                           'Документ проанализирован'}
                        </p>
                        {analysisResult.analysis?.expertOpinion?.criticalPoints?.length > 0 && (
                          <div className="critical-section">
                            <strong>Критические моменты:</strong>
                            <ul className="critical-list">
                              {analysisResult.analysis.expertOpinion.criticalPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysisResult.data?.analysis?.expertOpinion?.criticalPoints?.length > 0 && (
                          <div className="critical-section">
                            <strong>Критические моменты:</strong>
                            <ul className="critical-list">
                              {analysisResult.data.analysis.expertOpinion.criticalPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysisResult.data?.expertOpinion?.criticalPoints?.length > 0 && (
                          <div className="critical-section">
                            <strong>Критические моменты:</strong>
                            <ul className="critical-list">
                              {analysisResult.data.expertOpinion.criticalPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Юридические ошибки */}
                    {(analysisResult.analysis?.legalErrors?.length > 0 || analysisResult.data?.analysis?.legalErrors?.length > 0 || analysisResult.data?.legalErrors?.length > 0) && (
                      <div className="analysis-section errors-section">
                        <div className="section-header">
                          <span className="section-icon">⚠️</span>
                          <h4>Юридические ошибки ({analysisResult.analysis?.legalErrors?.length || analysisResult.data?.analysis?.legalErrors?.length || analysisResult.data?.legalErrors?.length})</h4>
                        </div>
                        <div className="section-content">
                          {(analysisResult.analysis?.legalErrors || analysisResult.data?.analysis?.legalErrors || analysisResult.data?.legalErrors || []).map((error, i) => (
                            <div key={i} className={`error-box severity-${error.severity || 'medium'}`}>
                              <div className="error-header-new">
                                <span className="error-type-badge">{error.type}</span>
                                <span className={`severity-badge severity-${error.severity}`}>{translateSeverity(error.severity)}</span>
                              </div>
                              <p className="error-text">{error.description}</p>
                              {error.solution && <p className="error-meta"><strong>✅ Решение:</strong> {error.solution}</p>}
                              {error.legalBasis && <p className="error-meta"><strong>📜 Основание:</strong> {error.legalBasis}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Риски */}
                    {(analysisResult.analysis?.risks?.length > 0 || analysisResult.data?.analysis?.risks?.length > 0 || analysisResult.data?.risks?.length > 0) && (
                      <div className="analysis-section risks-section">
                        <div className="section-header">
                          <span className="section-icon">🚨</span>
                          <h4>Выявленные риски</h4>
                        </div>
                        <div className="risks-grid">
                          {(analysisResult.analysis?.risks || analysisResult.data?.analysis?.risks || analysisResult.data?.risks || []).map((risk, i) => (
                            <div key={i} className="risk-card">
                              <div className="risk-title">{risk.category}</div>
                              <p className="risk-text">{risk.description}</p>
                              {risk.mitigation && <p className="risk-meta"><strong>Как минимизировать:</strong> {risk.mitigation}</p>}
                              {risk.legalConsequences && <p className="risk-meta"><strong>Правовые последствия:</strong> {risk.legalConsequences}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Рекомендации */}
                    {(analysisResult.analysis?.recommendations?.length > 0 || analysisResult.data?.analysis?.recommendations?.length > 0 || analysisResult.data?.recommendations?.length > 0) && (
                      <div className="analysis-section recommendations-section">
                        <div className="section-header">
                          <span className="section-icon">💡</span>
                          <h4>Рекомендации Галины</h4>
                        </div>
                        <div className="recommendations-grid">
                          {(analysisResult.analysis?.recommendations || analysisResult.data?.analysis?.recommendations || analysisResult.data?.recommendations || []).map((rec, i) => (
                            <div key={i} className={`rec-card priority-${rec.priority || 'medium'}`}>
                              <div className="rec-header-new">
                                <span className={`priority-dot priority-${rec.priority}`}></span>
                                <strong>{rec.category}</strong>
                              </div>
                              <p className="rec-text">{rec.description}</p>
                              {rec.implementation && <p className="rec-meta"><strong>Как реализовать:</strong> {rec.implementation}</p>}
                              {rec.deadline && <p className="rec-meta"><strong>Сроки:</strong> {rec.deadline}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Следующие шаги */}
                    {(analysisResult.analysis?.expertOpinion?.nextSteps?.length > 0 || analysisResult.data?.analysis?.expertOpinion?.nextSteps?.length > 0 || analysisResult.data?.expertOpinion?.nextSteps?.length > 0) && (
                      <div className="analysis-section next-steps-section">
                        <div className="section-header">
                          <span className="section-icon">🎯</span>
                          <h4>Следующие шаги</h4>
                        </div>
                        <ol className="steps-list">
                          {(analysisResult.analysis?.expertOpinion?.nextSteps || analysisResult.data?.analysis?.expertOpinion?.nextSteps || analysisResult.data?.expertOpinion?.nextSteps || []).map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                  </div>
                )}
                
                {ocrResult && ocrResult.kind === 'pdf' && (
                  <div className="ocr-results">
                    <div className="ocr-header">
                      <h4>PDF загружен</h4>
                    </div>
                    <div className="fields-grid">
                      <div className="field-group"><label className="field-label">Файл</label><div className="field-value">{lastUploadMeta?.filename}</div></div>
                      <div className="field-group"><label className="field-label">Размер</label><div className="field-value">{formatSize(lastUploadMeta?.sizeBytes)}</div></div>
                      <div className="field-group"><label className="field-label">ID</label><div className="field-value">{ocrResult.id}</div></div>
                      <div className="field-group"><label className="field-label">Хранится до</label><div className="field-value">{ocrResult.expiresAt}</div></div>
                    </div>
                    {ocrResult.recognizedText && (
                      <div className="raw-text-section" style={{ marginTop: 12 }}>
                        <h5>Распознанный текст:</h5>
                        <div className="raw-text-content">
                          {ocrResult.recognizedText}
                        </div>
                      </div>
                    )}
                    {ocrResult.extractedData && Object.keys(ocrResult.extractedData).length > 0 && (
                      <div className="fields-grid" style={{ marginTop: 12 }}>
                        {Object.entries(ocrResult.extractedData).map(([k, v]) => (
                          <div key={k} className="field-group"><label className="field-label">{k}</label><div className="field-value">{String(v)}</div></div>
                        ))}
                      </div>
                    )}
                    
                  </div>
                )}
                
                {/* Кнопка сохранения документа */}
                {(analysisResult || ocrResult) && (
                  <div className="preview-actions">
                    <button 
                      className="save-btn"
                      onClick={handleSaveDocument}
                      disabled={isSaving}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      {isSaving ? 'Сохранение...' : 'Сохранить документ'}
                    </button>
                  </div>
                )}
              </div>
        </div>
      )}

          {/* Камера для съемки */}
          {isEditing && !uploadedImage && (
            <div className="camera-section">
              <div className="camera-header">
                <h3>Съемка документа</h3>
                <button 
                  className="close-camera-btn"
                  onClick={() => setIsEditing(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="camera-content">
                <video
                  ref={cameraRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />
                {!isCameraReady && !cameraError && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Инициализация камеры…</div>
                )}
                {cameraError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#ff6b6b' }}>{cameraError}</div>
                )}
                
                <button 
                  className="capture-btn"
                  onClick={handleCameraCapture}
                  disabled={!isCameraReady}
                >
                  <Camera size={24} />
                  Сделать снимок
                </button>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                  Советы: выключите вспышку/HDR, держите камеру параллельно, заполните кадр документом.
                </div>
              </div>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="loading-overlay">
            <p>{progressStage || 'Обработка документа...'}</p>
            <div className="progress-wrapper">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.round(progress)}%` }} />
              </div>
              <div className="progress-label">{Math.round(progress)}%</div>
            </div>
            <div className="progress-stages">
              <div className={`stage ${progress >= 20 ? 'completed' : progress >= 5 ? 'active' : ''}`}>
                <span className="stage-text">Подготовка</span>
              </div>
              <div className={`stage ${progress >= 45 ? 'completed' : progress >= 25 ? 'active' : ''}`}>
                <span className="stage-text">Отправка</span>
              </div>
              <div className={`stage ${progress >= 70 ? 'completed' : progress >= 50 ? 'active' : ''}`}>
                <span className="stage-text">Обработка</span>
              </div>
              <div className={`stage ${progress >= 90 ? 'completed' : progress >= 75 ? 'active' : ''}`}>
                <span className="stage-text">Анализ</span>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
              <button
                className="upload-btn secondary"
                onClick={onClose}
                type="button"
              >Назад</button>
              <button
                className="upload-btn"
                style={{ background: '#ff6b6b', color: 'white' }}
                type="button"
                onClick={() => {
                  try { controllerRef.current?.abort(); } catch (_) {}
                  try { xhrRef.current?.abort(); } catch (_) {}
                  setIsUploading(false);
                }}
              >Отмена</button>
            </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DocumentUpload; 