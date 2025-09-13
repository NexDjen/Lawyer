#!/usr/bin/env python3
"""
Улучшенный OCR API с предварительной обработкой изображений и сегментацией на строки
"""

import argparse
import sys
import os
import json
import time
import cv2
import shutil
import numpy as np
from datetime import timedelta
from pathlib import Path
import logging

# Добавляем текущую директорию в путь для импорта модулей
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from OCR_scripts.recognition import OCRPredictor
from OCR_scripts.config import Config

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
    )

def preprocess_image(image_path):
    """
    Предварительная обработка изображения для улучшения распознавания
    """
    # Читаем изображение
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Не удалось прочитать изображение: {image_path}")
    
    # Конвертируем в оттенки серого
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Увеличиваем контраст
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # Убираем шум
    denoised = cv2.fastNlMeansDenoising(enhanced)
    
    # Бинаризация
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Морфологические операции для улучшения текста
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    processed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    return processed

def segment_text_lines(image):
    """
    Сегментирует изображение на строки текста
    """
    # Находим горизонтальные проекции для выделения строк
    horizontal_projection = np.sum(image == 0, axis=1)  # Считаем черные пиксели
    
    # Находим строки текста
    lines = []
    in_line = False
    line_start = 0
    
    for i, projection in enumerate(horizontal_projection):
        if projection > 0 and not in_line:  # Начало строки
            line_start = i
            in_line = True
        elif projection == 0 and in_line:  # Конец строки
            line_end = i
            if line_end - line_start > 5:  # Минимальная высота строки
                lines.append((line_start, line_end))
            in_line = False
    
    # Если строка не закончилась
    if in_line and len(horizontal_projection) - line_start > 5:
        lines.append((line_start, len(horizontal_projection)))
    
    return lines

def extract_line_images(image, lines):
    """
    Извлекает изображения строк из основного изображения
    """
    line_images = []
    
    for i, (start, end) in enumerate(lines):
        # Добавляем небольшой отступ
        start = max(0, start - 2)
        end = min(image.shape[0], end + 2)
        
        line_img = image[start:end, :]
        
        # Проверяем, что строка не пустая
        if np.sum(line_img == 0) > 10:  # Минимум 10 черных пикселей
            line_images.append(line_img)
    
    return line_images

def process_image_enhanced_ocr(input_path, output_dir=None):
    """
    Обрабатывает изображение с помощью улучшенного OCR с сегментацией на строки
    """
    setup_logging()
    
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(input_path), 'temp_ocr_output')
    
    # Создаем временную директорию
    temp_dir = Path(output_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Проверяем существование входного файла
        input_path_obj = Path(input_path)
        if not input_path_obj.exists():
            logging.error(f'Входное изображение не найдено: {input_path}')
            return "Ошибка: входное изображение не найдено"
        
        # Предварительная обработка изображения
        logging.info('Предварительная обработка изображения...')
        processed_image = preprocess_image(input_path)
        
        # Сегментация на строки
        logging.info('Сегментация изображения на строки...')
        lines = segment_text_lines(processed_image)
        logging.info(f'Найдено строк: {len(lines)}')
        
        if not lines:
            logging.warning('Строки текста не найдены')
            return "Текст не найден на изображении"
        
        # Извлечение изображений строк
        line_images = extract_line_images(processed_image, lines)
        logging.info(f'Извлечено изображений строк: {len(line_images)}')
        
        # Сохраняем изображения строк
        for i, line_img in enumerate(line_images):
            line_path = temp_dir / f'line_{i:03d}.jpg'
            cv2.imwrite(str(line_path), line_img)
        
        # Распознавание текста
        logging.info('Начинаем распознавание текста')
        config = Config()
        recognition_model_path = os.path.join(os.path.dirname(__file__), 'models', 'best_model-0.6780.pt')
        
        if not os.path.exists(recognition_model_path):
            logging.error(f'Модель распознавания не найдена: {recognition_model_path}')
            return "Ошибка: модель распознавания не найдена"
        
        predictor = OCRPredictor(recognition_model_path, config)
        predictions = predictor.predict_from_folder(str(temp_dir))
        
        # Получаем результат
        if predictions:
            # Сортируем предсказания по имени файла (порядку строк)
            sorted_predictions = sorted(predictions.items(), key=lambda x: x[0])
            result_lines = [pred[1] for pred in sorted_predictions]
            result_text = '\n'.join(result_lines)
            logging.info(f'Распознанный текст: {result_text}')
            return result_text
        else:
            logging.warning('Не удалось распознать текст')
            return "Текст не распознан"
            
    except Exception as e:
        logging.error(f'Ошибка при обработке изображения: {str(e)}')
        return f"Ошибка обработки: {str(e)}"
    
    finally:
        # Очищаем временные файлы
        try:
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
                logging.info(f'Временная директория очищена: {temp_dir}')
        except Exception as e:
            logging.warning(f'Не удалось очистить временную директорию: {e}')

def main():
    parser = argparse.ArgumentParser(description='Улучшенный OCR API для распознавания текста из изображений')
    parser.add_argument('--input', required=True, help='Путь к входному изображению')
    parser.add_argument('--output', help='Директория для выходных файлов (опционально)')
    parser.add_argument('--json', action='store_true', help='Вывести результат в JSON формате')
    
    args = parser.parse_args()
    
    start_time = time.time()
    
    try:
        # Обрабатываем изображение
        result_text = process_image_enhanced_ocr(args.input, args.output)
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        # Формируем результат
        if args.json:
            result = {
                'success': True,
                'text': result_text,
                'processing_time': str(timedelta(seconds=elapsed_time)),
                'input_file': args.input
            }
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"=== РЕЗУЛЬТАТ OCR ===")
            print(f"Входной файл: {args.input}")
            print(f"Время обработки: {str(timedelta(seconds=elapsed_time))}")
            print(f"Распознанный текст:")
            print("-" * 50)
            print(result_text)
            print("-" * 50)
            
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'input_file': args.input
        }
        
        if args.json:
            print(json.dumps(error_result, ensure_ascii=False, indent=2))
        else:
            print(f"ОШИБКА: {str(e)}")
        
        sys.exit(1)

if __name__ == '__main__':
    main() 