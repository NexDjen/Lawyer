import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, ArrowUpCircle, FileText, Image, File } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import './ChatInput.css';

const ChatInput = ({ 
  onSendMessage, 
  placeholder = "Введите сообщение...",
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Автоматическое изменение высоты textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleStartRecording = async () => {
    if (disabled || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        // обработка завершения записи происходит в handleStopAndSend
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (e) {
      console.error('Mic error', e);
    }
  };

  const handleStopAndSend = async () => {
    if (!isRecording) return;
    try {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return;
      // Дождёмся сбора всех чанков
      await new Promise((resolve) => {
        recorder.onstop = resolve;
        recorder.stop();
      });
      recorder.stream.getTracks().forEach(t => t.stop());
      const type = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      const formData = new FormData();
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('audio', blob, `recording.${ext}`);
      const res = await fetch(buildApiUrl('chat/transcribe'), { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Ошибка транскрибации');
      const data = await res.json();
      if (data && data.text) {
        onSendMessage(data.text);
      }
    } catch (e) {
      console.error('Transcribe error', e);
    } finally {
      setIsRecording(false);
      mediaRecorderRef.current = null;
      chunksRef.current = [];
    }
  };

  // Обработка загрузки файлов
  const handleFileUpload = () => {
    alert('Upload button clicked');
    console.log('File upload button clicked');
    if (fileInputRef.current) {
      console.log('Triggering file input click');
      fileInputRef.current.click();
    } else {
      console.error('fileInputRef is null');
    }
  };

  const handleFileChange = async (event) => {
    console.log('File change event triggered');
    const files = Array.from(event.target.files);
    console.log('Selected files:', files);
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of files) {
        await processFile(file);
      }
    } catch (error) {
      console.error('File processing error:', error);
    } finally {
      setIsUploading(false);
      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(buildApiUrl('documents/upload'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const result = await response.json();
      
      if (result.recognizedText) {
        // Отправляем распознанный текст как сообщение
        onSendMessage(`📎 Загружен файл: ${file.name}\n\nРаспознанный текст:\n${result.recognizedText}`);
      } else {
        onSendMessage(`📎 Загружен файл: ${file.name}`);
      }
      
      // Добавляем файл в список загруженных
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date()
      }]);
      
    } catch (error) {
      console.error('File processing error:', error);
      onSendMessage(`❌ Ошибка обработки файла ${file.name}: ${error.message}`);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image size={16} />;
    if (fileType.includes('pdf')) return <FileText size={16} />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText size={16} />;
    return <File size={16} />;
  };



  return (
    <div className="chat-input">
      <div className="chat-input__container">
        <div className="chat-input__left">
          <button 
            className="chat-input__button" 
            title="Вложить файл" 
            onClick={handleFileUpload}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <div className="spinner" />
            ) : (
              <Paperclip size={18} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          maxLength={4000}
        />
        
        <div className="chat-input__actions">
          {isRecording ? (
            // Во время записи показываем только одну стрелку отправки голосового
            <button
              className="chat-input__button"
              title="Завершить запись и отправить"
              onClick={handleStopAndSend}
            >
              <ArrowUpCircle size={20} />
            </button>
          ) : (
            <>
              <button
                className="chat-input__button"
                title="Записать голосовое"
                onClick={handleStartRecording}
              >
                <Mic size={18} />
              </button>
              <button
                className="chat-input__button chat-input__button--send"
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                title="Отправить сообщение"
              >
                <Send size={20} />
              </button>
            </>
          )}
        </div>
      </div>
      
      {message.length > 0 && (
        <div className="chat-input__counter">
          {message.length}/4000
        </div>
      )}
      
      {uploadedFiles.length > 0 && (
        <div className="chat-input__files">
          <div className="chat-input__files-title">Загруженные файлы:</div>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="chat-input__file-item">
              {getFileIcon(file.type)}
              <span className="chat-input__file-name">{file.name}</span>
              <span className="chat-input__file-size">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInput; 