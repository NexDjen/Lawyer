#!/usr/bin/env python3
"""
OCR API для интеграции с Node.js
Принимает изображение и возвращает распознанный текст
"""

import argparse
import sys
import os
import json
import time
from datetime import timedelta
from pathlib import Path
import logging

# Добавляем текущую директорию в путь для импорта модулей
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from OCR_scripts.segmentation import ImageSegmenter
from OCR_scripts.recognition import OCRPredictor
from OCR_scripts.config import Config
from OCR_scripts.answer_grader import AnswerGrader

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
    )

def process_image_with_ocr(input_path, output_dir=None):
    """
    Обрабатывает изображение с помощью OCR и возвращает распознанный текст
    
    Args:
        input_path (str): Путь к входному изображению
        output_dir (str): Директория для сохранения промежуточных результатов
    
    Returns:
        str: Распознанный текст
    """
    setup_logging()
    
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(input_path), 'temp_ocr_output')
    
    # Создаем временную директорию
    temp_dir = Path(output_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Настройки сегментации
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'model.pt')
        conf_threshold = 0.3
        overlap_threshold = 0.35
        img_format = 'png'
        scale_coeff = 2
        scale_bbox = 0.01
        space_threshold_coeff = 0.0025
        min_space_width = 0.02
        
        # Проверяем существование модели
        if not os.path.exists(model_path):
            logging.error(f'Модель сегментации не найдена: {model_path}')
            return "Ошибка: модель сегментации не найдена"
        
        # Сегментация изображения
        logging.info(f'Начинаем сегментацию изображения: {input_path}')
        segmenter = ImageSegmenter(model_path)
        
        input_path_obj = Path(input_path)
        if not input_path_obj.exists():
            logging.error(f'Входное изображение не найдено: {input_path}')
            return "Ошибка: входное изображение не найдено"
        
        # Обрабатываем изображение
        segmenter.process_image(
            input_path_obj, 
            temp_dir, 
            img_format, 
            is_bytes=False
        )
        
        # Проверяем, что сегментация создала файлы
        cropped_files = list(temp_dir.glob(f'*.{img_format}'))
        if not cropped_files:
            logging.warning('Сегментация не создала файлы. Попробуем распознать исходное изображение.')
            # Копируем исходное изображение как один сегмент
            import shutil
            shutil.copy2(input_path, temp_dir / f'segment_0.{img_format}')
        
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
            result_text = predictor.get_and_print_results(predictions, str(temp_dir))
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
            import shutil
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
                logging.info(f'Временная директория очищена: {temp_dir}')
        except Exception as e:
            logging.warning(f'Не удалось очистить временную директорию: {e}')

def main():
    parser = argparse.ArgumentParser(description='OCR API для распознавания текста из изображений')
    parser.add_argument('--input', required=True, help='Путь к входному изображению')
    parser.add_argument('--output', help='Директория для выходных файлов (опционально)')
    parser.add_argument('--json', action='store_true', help='Вывести результат в JSON формате')
    
    args = parser.parse_args()
    
    start_time = time.time()
    
    try:
        # Обрабатываем изображение
        result_text = process_image_with_ocr(args.input, args.output)
        
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