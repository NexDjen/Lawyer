#!/usr/bin/env python3
"""
Тестовый скрипт для проверки работы модели распознавания
"""

import sys
import os
import torch
import cv2
import numpy as np

# Добавляем текущую директорию в путь для импорта модулей
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from OCR_scripts.recognition import OCRPredictor
from OCR_scripts.config import Config

def test_model():
    print("🔍 Тестирование модели распознавания...")
    
    # Проверяем существование модели
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'best_model-0.6780.pt')
    print(f"📁 Путь к модели: {model_path}")
    print(f"📊 Размер модели: {os.path.getsize(model_path) / (1024*1024):.2f} MB")
    
    if not os.path.exists(model_path):
        print("❌ Модель не найдена!")
        return False
    
    try:
        # Инициализируем конфигурацию
        print("⚙️ Инициализация конфигурации...")
        config = Config()
        print(f"📋 Алфавит: {config.alphabet[:50]}...")
        print(f"🖥️ Устройство: {config.device}")
        
        # Загружаем модель
        print("🔄 Загрузка модели...")
        predictor = OCRPredictor(model_path, config)
        print("✅ Модель загружена успешно!")
        
        # Создаем тестовое изображение (белый фон с черным текстом)
        print("🎨 Создание тестового изображения...")
        test_image = np.ones((100, 400, 3), dtype=np.uint8) * 255  # Белый фон
        
        # Добавляем простой текст
        cv2.putText(test_image, 'TEST', (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 3)
        
        # Сохраняем тестовое изображение
        test_image_path = 'test_image.jpg'
        cv2.imwrite(test_image_path, test_image)
        print(f"💾 Тестовое изображение сохранено: {test_image_path}")
        
        # Тестируем распознавание
        print("🔍 Тестирование распознавания...")
        result = predictor.predict_single(test_image)
        print(f"📝 Результат распознавания: '{result}'")
        
        # Очищаем
        os.remove(test_image_path)
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_model()
    if success:
        print("✅ Тест завершен успешно!")
    else:
        print("❌ Тест завершен с ошибками!") 