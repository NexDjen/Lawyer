import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, ArrowUpCircle } from 'lucide-react';
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
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const textareaRef = useRef(null);

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



  return (
    <div className="chat-input">
      <div className="chat-input__container">
        <div className="chat-input__left">
          <button className="chat-input__button" title="Вложить файл" onClick={() => {}}>
            <Paperclip size={18} />
          </button>
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
    </div>
  );
};

export default ChatInput; 