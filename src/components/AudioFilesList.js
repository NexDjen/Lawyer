import React, { useState, useEffect, useCallback } from 'react';
import { 
  Headphones, 
  Play, 
  Pause, 
  Trash2, 
  Calendar,
  FileAudio,
  HardDrive,
  X,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { buildApiUrl, buildFullUrl } from '../config/api';
import './AudioFilesList.css';

const AudioFilesList = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playingFile, setPlayingFile] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [newFilesCount, setNewFilesCount] = useState(0);

  // Загрузка списка файлов
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(buildApiUrl('court/audio-files'));
      if (!response.ok) {
        throw new Error('Ошибка загрузки файлов');
      }
      
      const data = await response.json();
      if (data.success) {
        const previousCount = files.length;
        setFiles(data.files);
        console.log(`Загружено ${data.files.length} файлов`);
        
        // Если количество файлов увеличилось, выводим информацию о новых файлах
        if (data.files.length > previousCount) {
          const newFiles = data.files.slice(0, data.files.length - previousCount);
          console.log('Новые аудио файлы:', newFiles.map(f => f.filename));
          setNewFilesCount(newFiles.length);
          
          // Сбрасываем счетчик новых файлов через 5 секунд
          setTimeout(() => {
            setNewFilesCount(0);
          }, 5000);
        }
      } else {
        throw new Error(data.error || 'Ошибка загрузки файлов');
      }
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [files.length]);

  // Удаление файла
  const deleteFile = async (filename) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот файл?')) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`court/audio-files/${filename}`), {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Ошибка удаления файла');
      }
      
      // Обновляем список файлов
      await loadFiles();
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      alert('Ошибка удаления файла: ' + error.message);
    }
  };

  // Воспроизведение файла
  const playFile = (file) => {
    if (playingFile === file.filename) {
      // Останавливаем воспроизведение
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingFile(null);
      setAudioElement(null);
    } else {
      // Начинаем воспроизведение
      if (audioElement) {
        audioElement.pause();
      }
      
    const audio = new Audio(buildFullUrl(`court/audio-files/${file.filename}`));
      audio.onended = () => {
        setPlayingFile(null);
        setAudioElement(null);
      };
      
      audio.play();
      setPlayingFile(file.filename);
      setAudioElement(audio);
    }
  };

  // Скачивание файла
  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = buildFullUrl(`court/audio-files/${file.filename}`);
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Показываем уведомление о скачивании
    console.log(`Файл ${file.filename} скачивается...`);
  };

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Загружаем файлы при открытии
  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, loadFiles]);

  // Автоматическое обновление списка каждые 10 секунд
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      loadFiles();
    }, 10000); // 10 секунд

    return () => clearInterval(interval);
  }, [isOpen, loadFiles]);

  // Очистка аудио при закрытии
  useEffect(() => {
    if (!isOpen && audioElement) {
      audioElement.pause();
      setPlayingFile(null);
      setAudioElement(null);
    }
  }, [isOpen, audioElement]);

  if (!isOpen) return null;

  return (
    <div className="audio-files-overlay">
      <div className="audio-files-modal">
        <div className="audio-files-header">
                      <div className="header-content">
              <h2>
                <Headphones size={24} />
                Аудиозаписи заседаний
                {newFilesCount > 0 && (
                  <span className="new-files-badge">
                    +{newFilesCount} новых
                  </span>
                )}
              </h2>
              <p>Просмотр и управление сохраненными записями</p>
              <button 
                className="refresh-header-button"
                onClick={loadFiles}
                title="Обновить список"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="audio-files-content">
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Загрузка файлов...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertTriangle size={20} />
              <p>{error}</p>
              <button onClick={loadFiles}>Попробовать снова</button>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="empty-state">
              <FileAudio size={48} />
              <h3>Нет сохраненных записей</h3>
              <p>Записи появятся здесь после анализа судебных заседаний</p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="files-list">
              <div className="files-header">
                <h3>Найдено записей: {files.length}</h3>
                <button onClick={loadFiles} className="refresh-button">
                  Обновить
                </button>
              </div>
              
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <div className="file-icon">
                      <FileAudio size={20} />
                    </div>
                    <div className="file-details">
                      <div className="file-name">{file.filename}</div>
                      <div className="file-meta">
                        <span className="file-size">
                          <HardDrive size={14} />
                          {formatFileSize(file.size)}
                        </span>
                        <span className="file-date">
                          <Calendar size={14} />
                          {formatDate(file.uploadDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="file-actions">
                    <button
                      className={`play-button ${playingFile === file.filename ? 'playing' : ''}`}
                      onClick={() => playFile(file)}
                      title={playingFile === file.filename ? 'Остановить' : 'Воспроизвести'}
                    >
                      {playingFile === file.filename ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    
                    <button
                      className="download-button"
                      onClick={() => downloadFile(file)}
                      title="Скачать"
                    >
                      <Download size={16} />
                    </button>
                    
                    <button
                      className="delete-button"
                      onClick={() => deleteFile(file.filename)}
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioFilesList; 