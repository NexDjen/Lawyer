#!/usr/bin/env python3
"""
Отладочный скрипт для проверки работы OCR
"""

import sys
import os
import cv2
import numpy as np
import json

# Добавляем текущую директорию в путь для импорта модулей
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from OCR_scripts.recognition import OCRPredictor
from OCR_scripts.config import Config

def debug_ocr(image_path):
    print(f"🔍 Отладка OCR для изображения: {image_path}")
    
    # Проверяем существование файла
    if not os.path.exists(image_path):
        print(f"❌ Файл не найден: {image_path}")
        return
    
    # Читаем изображение
    image = cv2.imread(image_path)
    if image is None:
        print(f"❌ Не удалось прочитать изображение: {image_path}")
        return
    
    print(f"📊 Размер изображения: {image.shape}")
    print(f"📊 Тип данных: {image.dtype}")
    
    # Инициализируем конфигурацию
    config = Config()
    print(f"📋 Алфавит: {config.alphabet[:50]}...")
    print(f"🖥️ Устройство: {config.device}")
    print(f"📐 Размер изображения для модели: {config.image_height}x{config.image_width}")
    
    # Загружаем модель
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'best_model-0.6780.pt')
    print(f"📁 Путь к модели: {model_path}")
    
    if not os.path.exists(model_path):
        print(f"❌ Модель не найдена: {model_path}")
        return
    
    try:
        predictor = OCRPredictor(model_path, config)
        print("✅ Модель загружена успешно!")
        
        # Тестируем прямое распознавание
        print("🔍 Тестирование прямого распознавания...")
        result = predictor.predict_single(image)
        print(f"📝 Результат: '{result}'")
        
        # Тестируем через папку
        print("🔍 Тестирование через папку...")
        import tempfile
        import shutil
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Сохраняем изображение во временную папку
            temp_image_path = os.path.join(temp_dir, 'test.jpg')
            cv2.imwrite(temp_image_path, image)
            print(f"💾 Изображение сохранено: {temp_image_path}")
            
            # Распознаем из папки
            predictions = predictor.predict_from_folder(temp_dir)
            print(f"📋 Предсказания: {predictions}")
            
            if predictions:
                result_text = predictor.get_and_print_results(predictions, temp_dir)
                print(f"📝 Результат из папки: '{result_text}'")
            else:
                print("❌ Нет предсказаний из папки")
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    if len(sys.argv) != 2:
        print("Использование: python3 debug_ocr.py <путь_к_изображению>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    debug_ocr(image_path)

if __name__ == '__main__':
    main() 