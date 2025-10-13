import React, { useState, useEffect } from 'react';
import { Volume2, Mic, Play, X } from 'lucide-react';
import { buildApiUrl, buildFullUrl } from '../config/api';
import './AudioPermission.css';

const AudioPermission = ({ onGranted, onDenied, isVisible }) => {
  const [permissionState, setPermissionState] = useState('requesting');
  const [testAudio, setTestAudio] = useState(null);

  useEffect(() => {
    if (isVisible) {
      checkAudioPermission();
    }
  }, [isVisible]);

  const checkAudioPermission = async () => {
    try {
      // Проверяем поддержку getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionState('granted');
        onGranted();
      } else {
        setPermissionState('not-supported');
      }
    } catch (error) {
      console.log('Разрешение на аудио не получено:', error);
      setPermissionState('denied');
    }
  };

  const requestPermission = async () => {
    setPermissionState('requesting');
    await checkAudioPermission();
  };

  const handleTestAudio = async () => {
    try {
      const audio = new Audio(buildFullUrl('tts'));
      audio.volume = 0.5;
      
      const testResponse = await fetch(buildApiUrl('tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: 'Тестовое воспроизведение аудио работает корректно!', 
          voice: 'nova', 
          model: 'tts-1' 
        })
      });
      
      if (testResponse.ok) {
        const blob = await testResponse.blob();
        const url = URL.createObjectURL(blob);
        const testAudio = new Audio(url);
        
        testAudio.onended = () => {
          URL.revokeObjectURL(url);
          setTestAudio(null);
        };
        
        testAudio.onerror = () => {
          URL.revokeObjectURL(url);
          setTestAudio(null);
        };
        
        setTestAudio(testAudio);
        await testAudio.play();
      }
    } catch (error) {
      console.error('Ошибка тестового воспроизведения:', error);
    }
  };

  const handleDeny = () => {
    setPermissionState('denied');
    onDenied();
  };

  if (!isVisible) return null;

  return (
    <div className="audio-permission">
      <div className="audio-permission__overlay"></div>
      <div className="audio-permission__modal">
        <div className="audio-permission__header">
          <div className="audio-permission__icon">
            <Volume2 size={24} />
          </div>
          <h3 className="audio-permission__title">Разрешить воспроизведение аудио</h3>
          <button 
            className="audio-permission__close"
            onClick={handleDeny}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="audio-permission__content">
          <p className="audio-permission__description">
            Для автоматического воспроизведения ответов ИИ-юриста необходимо разрешить воспроизведение аудио в браузере.
          </p>
          
          <div className="audio-permission__features">
            <div className="audio-permission__feature">
              <Mic size={16} />
              <span>Голосовое управление</span>
            </div>
            <div className="audio-permission__feature">
              <Volume2 size={16} />
              <span>Автоматическое озвучивание</span>
            </div>
          </div>
          
          {permissionState === 'requesting' && (
            <div className="audio-permission__actions">
              <button 
                className="audio-permission__btn audio-permission__btn--primary"
                onClick={requestPermission}
              >
                Разрешить аудио
              </button>
            </div>
          )}
          
          {permissionState === 'granted' && (
            <div className="audio-permission__success">
              <div className="audio-permission__success-icon">✅</div>
              <p>Разрешение на аудио получено!</p>
            </div>
          )}
          
          {permissionState === 'denied' && (
            <div className="audio-permission__error">
              <div className="audio-permission__error-icon">❌</div>
              <p>Разрешение на аудио отклонено</p>
              <button 
                className="audio-permission__btn audio-permission__btn--primary"
                onClick={requestPermission}
              >
                Попробовать снова
              </button>
            </div>
          )}
          
          {permissionState === 'not-supported' && (
            <div className="audio-permission__error">
              <div className="audio-permission__error-icon">⚠️</div>
              <p>Ваш браузер не поддерживает аудио API</p>
              <p className="audio-permission__fallback">
                Будет использован браузерный синтез речи
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPermission; 