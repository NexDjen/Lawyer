import React, { useState } from 'react';
import { Bot, User, MessageCircle, Volume2, Loader, Copy, Download } from 'lucide-react';
import { formatTime } from '../utils/dateUtils';
import { buildApiUrl } from '../config/api';
import './ChatMessage.css';

const ChatMessage = ({ message, onRetry, isLastMessage, onDownloadDocument }) => {
  const { type, content, timestamp, id, hasDownloadableContent } = message;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState(null);

  const getMessageIcon = () => {
    switch (type) {
      case 'bot':
        return <Bot size={20} />;
      case 'user':
        return <User size={20} />;
      case 'system':
        return <MessageCircle size={20} />;
      default:
        return <MessageCircle size={20} />;
    }
  };

  const getMessageClass = () => {
    const baseClass = 'chat-message';
    const typeClass = `chat-message--${type}`;
    const lastClass = isLastMessage ? 'chat-message--last' : '';
    return `${baseClass} ${typeClass} ${lastClass}`.trim();
  };

  const handleRetry = () => {
    if (onRetry && type === 'bot') {
      onRetry(id);
    }
  };

  const handlePlayTTS = async () => {
    if (isLoading || isPlaying) return;
    
    setIsLoading(true);
    
    try {
      // Проверяем, что пользователь взаимодействовал с страницей
      if (!document.hasFocus()) {
        console.log('Страница не в фокусе, пропускаем воспроизведение');
        return;
      }
      
      const res = await fetch(buildApiUrl('chat/windexai-tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, voice: 'nova', model: 'tts-1' })
      });
      
      console.log('Статус ответа TTS:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Ошибка TTS:', errorText);
        throw new Error(`Ошибка синтеза речи: ${res.status} ${res.statusText}`);
      }
      
      const blob = await res.blob();
      console.log('Получен аудио blob размером:', blob.size, 'байт');
      
      if (blob.size === 0) {
        throw new Error('Получен пустой аудио файл');
      }
      
      const url = URL.createObjectURL(blob);
      const audioObj = new Audio(url);
      
      // Добавляем обработчики событий
      audioObj.onerror = (e) => {
        console.error('Ошибка воспроизведения аудио:', e);
        setIsPlaying(false);
        setAudio(null);
        URL.revokeObjectURL(url);
        alert('Ошибка воспроизведения аудио');
      };
      
      audioObj.onloadstart = () => console.log('Аудио начало загрузки');
      audioObj.oncanplay = () => console.log('Аудио готово к воспроизведению');
      audioObj.onplay = () => console.log('Аудио начало воспроизведения');
      audioObj.onended = () => {
        console.log('Аудио воспроизведение завершено');
        setIsPlaying(false);
        setAudio(null);
        URL.revokeObjectURL(url);
      };
      
      setAudio(audioObj);
      setIsPlaying(true);
      
      // Пытаемся воспроизвести с обработкой ошибок
      try {
        await audioObj.play();
        console.log('Аудио начало воспроизводиться');
      } catch (playError) {
        console.error('Ошибка воспроизведения:', playError);
        setIsPlaying(false);
        setAudio(null);
        URL.revokeObjectURL(url);
        
        // Fallback на браузерный TTS
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(content);
          utterance.lang = 'ru-RU';
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          speechSynthesis.speak(utterance);
          console.log('Используем браузерный TTS как fallback');
        }
      }
    } catch (e) {
      console.error('Ошибка TTS:', e);
      setIsPlaying(false);
      setAudio(null);
      alert('Ошибка синтеза речи: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTTS = () => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
      setAudio(null);
    }
  };

  const toHtml = (raw = '') => {
    // Escape
    let text = (raw || '').replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks ```
    text = text.replace(/```([\s\S]*?)```/g, (m, p1) => {
      return `<pre><code>${p1}</code></pre>`;
    });
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold / Italic
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Headings like "Риски:" / "Рекомендации:" as strong
    text = text.replace(/^(\s*)([^\n:]{2,}):\s*$/gmi, '$1<strong>$2:</strong>');
    // URLs
    text = text.replace(/(https?:\/\/[^\s)]+)(\)?)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>$2');

    // Lists: transform blocks of - item into <ul>
    const lines = text.split(/\n/);
    let html = '';
    let inUL = false, inOL = false;
    const closeLists = () => {
      if (inUL) { html += '</ul>'; inUL = false; }
      if (inOL) { html += '</ol>'; inOL = false; }
    };
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trimEnd();
      if (/^\s*[-•]\s+/.test(line)) {
        if (!inUL) { closeLists(); html += '<ul>'; inUL = true; }
        html += `<li>${line.replace(/^\s*[-•]\s+/, '')}</li>`;
      } else if (/^\s*\d+\.\s+/.test(line)) {
        if (!inOL) { closeLists(); html += '<ol>'; inOL = true; }
        html += `<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`;
      } else if (line === '') {
        closeLists();
        html += '<br />';
      } else {
        closeLists();
        html += `<p>${line}</p>`;
      }
    }
    closeLists();
    return html;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || '');
    } catch (_) {}
  };

  const sanitizeFileName = (name) => {
    return (name || 'document')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'document';
  };

  const handleDownloadDocx = async () => {
    if (onDownloadDocument && content) {
      try {
        const lines = (content || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
        const titleCandidate = lines[0] || 'Юридический документ';
        const title = sanitizeFileName(titleCandidate);
        await onDownloadDocument(content, title);
      } catch (error) {
        console.error('Ошибка скачивания документа:', error);
        alert('Не удалось скачать документ');
      }
    }
  };

  return (
    <div className={getMessageClass()}>
      <div className="chat-message__avatar">
        {getMessageIcon()}
      </div>
      <div className="chat-message__content">
        <div
          className="chat-message__text chat-markdown"
          dangerouslySetInnerHTML={{ __html: toHtml(content) }}
        />
        <div className="chat-message__footer">
          <span className="chat-message__time">
            {formatTime(timestamp)}
          </span>
          {Boolean(content) && (
            <>
              <button
                className="chat-message__copy"
                onClick={handleCopy}
                title="Копировать ответ"
              >
                <Copy size={16} /> Копировать
              </button>
              {hasDownloadableContent && (
                <button
                  className="chat-message__tts"
                  onClick={handleDownloadDocx}
                  title="Скачать как DOCX"
                >
                  <Download size={18} /> Скачать DOCX
                </button>
              )}
              <button
                className="chat-message__tts"
                onClick={isPlaying ? handleStopTTS : handlePlayTTS}
                title={isPlaying ? 'Остановить озвучивание' : 'Озвучить ответ'}
                disabled={isLoading}
              >
                {isLoading ? <Loader size={18} className="spinning" /> : <Volume2 size={18} />}
                {isPlaying ? ' Стоп' : ' Озвучить'}
              </button>
              {onRetry && type === 'bot' && (
                <button 
                  className="chat-message__retry"
                  onClick={handleRetry}
                  title="Повторить запрос"
                >
                  Повторить
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 