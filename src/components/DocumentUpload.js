import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, X, Camera, FileText, Edit3, Save, RotateCcw, Brain, Loader } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import './DocumentUpload.css';

const DocumentUpload = ({ onTextExtracted, onClose, documentType = null, storageKey = 'documents', profileDefaults = {} }) => {
  const { updateCurrentUser, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [isProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState({});
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef(null);
  const cameraRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastUploadMeta, setLastUploadMeta] = useState(null);
  const [progress, setProgress] = useState(0);
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
    const docs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const idx = docs.findIndex(predicate);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], ...updater(docs[idx]) };
    } else if (fallbackNewDoc) {
      docs.unshift(fallbackNewDoc);
    }
    localStorage.setItem(storageKey, JSON.stringify(docs));
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
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    // Проверяем размер файла на клиенте (50GB лимит)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB - практически без ограничений
    if (file.size > MAX_FILE_SIZE) {
      alert(`Файл слишком большой. Максимальный размер: ${formatSize(MAX_FILE_SIZE)}. Размер вашего файла: ${formatSize(file.size)}`);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    // Имитация прогресса до 90% пока ждём ответ сервера
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const increment = prev < 70 ? 1.2 : prev < 90 ? 0.6 : 0.2;
        const next = Math.min(prev + increment, 90);
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
    }, 150);
    
    try {
      // Создаём карточку в списке документов со статусом "processing"
      const clientId = `tmp_${Date.now()}`;
      pendingIdRef.current = clientId;
      const isPdfLocal = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
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
          setUploadedImage(e.target.result);
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
      xhr.timeout = 120000; // 2 минуты таймаут для OCR
      // upload progress (реальный прогресс отправки файла)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.max(1, Math.min(90, Math.round((e.loaded / e.total) * 90)));
          setProgress(percent);
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
        progressValueRef.current = bump;
        const clientId = pendingIdRef.current;
        if (clientId) {
          upsertDocumentInStorage((d) => d.id === clientId, () => ({ progress: bump }));
        }
      };
      const responsePromise = new Promise((resolve, reject) => {
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
        xhr.ontimeout = () => reject(new Error('Таймаут при обработке документа. Попробуйте еще раз.'));
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
        performLLMAnalysis(result.recognizedText, file.name);
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
      progressValueRef.current = 100;
      setIsUploading(false);
      setTimeout(() => setProgress(0), 800);
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

  const handleSaveDocument = () => {
    const isPdf = !!(lastUploadMeta?.isPdf || (ocrResult && ocrResult.kind === 'pdf'));
    const documentData = isPdf
      ? {
          type: 'pdf',
          filename: lastUploadMeta?.filename,
          id: lastUploadMeta?.id,
          expiresAt: lastUploadMeta?.expiresAt,
          recognizedText: ocrResult?.recognizedText,
          extractedData: ocrResult?.extractedData,
          confidence: ocrResult?.confidence,
          analysis: ocrResult?.analysis || null
        }
      : { type: documentType?.id || 'unknown', fields: editedFields, image: uploadedImage, ocrResult: ocrResult };

    // При сохранении изображения — обновим профиль из вручную откорректированных полей
    if (!isPdf && documentType && editedFields) {
      applyExtractedToProfile(editedFields);
    }

    // Сохраняем в localStorage
    const savedDocuments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const newDocument = {
      id: Date.now(),
      name: isPdf ? (lastUploadMeta?.filename || 'PDF документ') : (documentType?.name || 'Документ'),
      content: isPdf
        ? (ocrResult?.recognizedText || `PDF: ${lastUploadMeta?.filename || ''} (истекает: ${lastUploadMeta?.expiresAt || ''})`)
        : JSON.stringify(documentData),
      uploadedAt: new Date().toISOString(),
      type: isPdf ? 'pdf' : (documentType?.id || 'legal'),
      status: isPdf ? 'uploaded' : 'analyzed',
      size: isPdf ? formatSize(lastUploadMeta?.sizeBytes || 0) : `${(uploadedImage?.length || 0) / 1024} KB`,
      analysis: ocrResult?.analysis || null
    };

    savedDocuments.unshift(newDocument);
    localStorage.setItem(storageKey, JSON.stringify(savedDocuments));

    // Для PDF пробрасываем чистый текст, чтобы карточка не показывала JSON
    const textToEmit = isPdf ? (ocrResult?.recognizedText || '') : JSON.stringify(documentData);
    onTextExtracted(textToEmit, isPdf ? (lastUploadMeta?.filename || 'PDF документ') : (documentType?.name || 'Документ'));
    onClose();
  };

  const handleRetakePhoto = () => {
    setUploadedImage(null);
    setOcrResult(null);
    setEditedFields({});
    setIsEditing(false);
    setAnalysisResult(null);
  };

  const performLLMAnalysis = async (documentText, fileName) => {
    try {
      setIsAnalyzing(true);
      console.log('Начинаем LLM анализ документа:', fileName);
      
      const analysisResponse = await fetch(buildApiUrl('documents/advanced-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: documentText,
          documentName: fileName,
          userId: user?.id || 'current-user'
        }),
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('Ошибка LLM анализа:', analysisResponse.status, errorText);
        throw new Error(`Ошибка анализа документа: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      console.log('LLM анализ завершен:', analysisData);
      setAnalysisResult(analysisData);
      
    } catch (error) {
      console.error('Ошибка LLM анализа:', error);
      // Не показываем ошибку пользователю, просто не показываем анализ
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fields = documentType ? getDocumentFields(documentType.id) : {};

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
                </div>
                
        <input
          ref={fileInputRef}
          type="file"
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
                  {uploadedImage ? <img src={uploadedImage} alt="Загруженный документ" /> : <div style={{padding:16,opacity:0.7}}>Предпросмотр доступен только для изображений</div>}
                </div>

                {ocrResult && !ocrResult.kind && (
                  <div className="ocr-results">
                    <div className="ocr-header">
                      <h4>Распознанные данные</h4>
                      <div className="ocr-actions">
                        <button 
                          className="edit-btn"
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          <Edit3 size={16} />
                          {isEditing ? 'Сохранить' : 'Редактировать'}
                        </button>
                        <button 
                          className="view-text-btn"
                          onClick={() => setShowRawText(!showRawText)}
                        >
                          <FileText size={16} />
                          {showRawText ? 'Скрыть текст' : 'Показать текст'}
                        </button>
                      </div>
                    </div>

                    {showRawText && ocrResult.recognizedText && (
                      <div className="raw-text-section">
                        <h5>Распознанный текст:</h5>
                        <div className="raw-text-content">
                          {ocrResult.recognizedText}
                        </div>
                      </div>
                    )}

                    <div className="fields-grid">
                      {Object.entries(fields).map(([fieldName, config]) => (
                        <div key={fieldName} className="field-group">
                          <label className="field-label">{config.label}</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="field-input"
                              value={editedFields[fieldName] || ''}
                              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                              placeholder={config.placeholder}
                            />
                          ) : (
                            <div className="field-value">
                              {editedFields[fieldName] || 'Не заполнено'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {ocrResult.confidence !== undefined && (
                      <div className="confidence-info">
                        <span>Уверенность распознавания: {Math.round(ocrResult.confidence * 100)}%</span>
                      </div>
                    )}
                    
                  </div>
                )}
                
                {/* LLM Анализ результатов */}
                {isAnalyzing && (
                  <div className="analysis-loading">
                    <div className="loading-spinner">
                      <Brain size={24} className="spinning" />
                    </div>
                    <p>ИИ анализирует документ...</p>
                  </div>
                )}
                
                {analysisResult && (
                  <div className="analysis-results">
                    <h4 className="results-title">
                      <Brain size={20} />
                      Результаты LLM анализа
                    </h4>
                    
                    <div className="analysis-grid">
                      <div className="analysis-card risks">
                        <h5>🚨 Риски</h5>
                        <div className="risk-level">
                          <span className="level-label">Уровень риска:</span>
                          <span className={`level-value level-${analysisResult.data?.analysis?.riskLevel || 'medium'}`}>
                            {analysisResult.data?.analysis?.riskLevel || 'Средний'}
                          </span>
                        </div>
                        <ul className="risk-list">
                          {analysisResult.data?.analysis?.risks?.map((risk, index) => (
                            <li key={index}>{risk}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="analysis-card recommendations">
                        <h5>💡 Рекомендации</h5>
                        <ul className="recommendation-list">
                          {analysisResult.data?.analysis?.recommendations?.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="analysis-card compliance">
                        <h5>⚖️ Соответствие</h5>
                        <div className="compliance-status">
                          <span className="status-label">Статус:</span>
                          <span className={`status-value status-${analysisResult.data?.analysis?.compliance || 'medium'}`}>
                            {analysisResult.data?.analysis?.compliance || 'Требует внимания'}
                          </span>
                        </div>
                        <p className="compliance-note">
                          {analysisResult.data?.analysis?.complianceNote || 'Документ требует дополнительной проверки'}
                        </p>
                      </div>

                      <div className="analysis-card summary">
                        <h5>📋 Краткое резюме</h5>
                        <p className="summary-text">
                          {analysisResult.data?.analysis?.summary || 'Анализ завершен. Обратите внимание на выявленные риски и рекомендации.'}
                        </p>
                      </div>
                    </div>
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
              </div>

              <div className="preview-actions">
                <button 
                  className="save-btn"
                  onClick={handleSaveDocument}
                  disabled={isUploading || isProcessing}
                >
                  <Save size={20} />
                  Сохранить документ
                </button>
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
            <div className="loading-spinner"></div>
            <p>Обработка документа...</p>
            <div className="progress-wrapper">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.round(progress)}%` }} />
              </div>
              <div className="progress-label">{Math.round(progress)}%</div>
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