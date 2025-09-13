#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import sys
import os
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import logging
from datetime import datetime

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleOCR:
    def __init__(self):
        # Проверяем доступность Tesseract
        try:
            pytesseract.get_tesseract_version()
            logger.info("Tesseract доступен")
        except Exception as e:
            logger.error(f"Tesseract не найден: {e}")
            sys.exit(1)
    
    def enhance_image(self, image_path):
        """Улучшение качества изображения"""
        try:
            # Загружаем изображение
            image = Image.open(image_path)
            
            # Конвертируем в RGB если нужно
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Увеличиваем размер изображения для лучшего распознавания
            width, height = image.size
            new_width = int(width * 2)
            new_height = int(height * 2)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Применяем улучшения
            # 1. Увеличиваем контрастность
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            # 2. Увеличиваем резкость
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.5)
            
            # 3. Нормализуем яркость
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.2)
            
            # 4. Применяем фильтр для уменьшения шума
            image = image.filter(ImageFilter.MedianFilter(size=3))
            
            logger.info("Изображение улучшено")
            return image
            
        except Exception as e:
            logger.error(f"Ошибка при улучшении изображения: {e}")
            return Image.open(image_path)
    
    def preprocess_image(self, image):
        """Предобработка изображения для лучшего распознавания"""
        try:
            # Конвертируем в оттенки серого
            if image.mode != 'L':
                image = image.convert('L')
            
            # Применяем дополнительное улучшение контраста
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            logger.info("Изображение предобработано")
            return image
            
        except Exception as e:
            logger.error(f"Ошибка при предобработке изображения: {e}")
            return image
    
    def recognize_text(self, image_path, enhance=False):
        """Распознавание текста с различными настройками"""
        start_time = datetime.now()
        
        try:
            # Загружаем и улучшаем изображение
            if enhance:
                image = self.enhance_image(image_path)
                image = self.preprocess_image(image)
            else:
                image = Image.open(image_path)
            
            # Пробуем разные конфигурации Tesseract
            configs = [
                # Основная конфигурация для русского текста
                '--oem 3 --psm 6 -l rus+eng',
                # Альтернативная конфигурация для печатного текста
                '--oem 3 --psm 3 -l rus+eng',
                # Конфигурация для рукописного текста
                '--oem 3 --psm 6 -l rus+eng',
                # Простая конфигурация
                '--oem 1 --psm 6 -l rus+eng',
                # Конфигурация для автоматического определения страницы
                '--oem 3 --psm 0 -l rus+eng'
            ]
            
            best_result = ""
            best_confidence = 0
            
            for i, config in enumerate(configs):
                try:
                    logger.info(f"Пробуем конфигурацию {i+1}: {config}")
                    
                    # Распознаем текст
                    result = pytesseract.image_to_string(
                        image, 
                        config=config,
                        output_type=pytesseract.Output.DICT
                    )
                    
                    text = result['text'].strip()
                    confidence = float(result['conf']) if result['conf'] else 0
                    
                    logger.info(f"Результат {i+1}: уверенность {confidence}%, длина текста: {len(text)}")
                    
                    # Выбираем лучший результат
                    if confidence > best_confidence and len(text) > 5:
                        best_result = text
                        best_confidence = confidence
                    
                except Exception as e:
                    logger.warning(f"Ошибка с конфигурацией {i+1}: {e}")
                    continue
            
            # Если все конфигурации не дали хорошего результата, пробуем простой подход
            if not best_result or best_confidence < 20:
                logger.info("Пробуем простой подход без дополнительных настроек")
                try:
                    simple_result = pytesseract.image_to_string(image, lang='rus+eng')
                    if len(simple_result.strip()) > len(best_result):
                        best_result = simple_result.strip()
                        best_confidence = 30  # Присваиваем среднюю уверенность
                except Exception as e:
                    logger.warning(f"Ошибка простого распознавания: {e}")
            
            processing_time = datetime.now() - start_time
            
            return {
                "success": True,
                "text": best_result,
                "confidence": best_confidence,
                "processing_time": str(processing_time),
                "input_file": image_path
            }
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании: {e}")
            return {
                "success": False,
                "error": str(e),
                "processing_time": str(datetime.now() - start_time),
                "input_file": image_path
            }

def main():
    parser = argparse.ArgumentParser(description='Простой OCR для распознавания текста')
    parser.add_argument('input', help='Путь к входному изображению')
    parser.add_argument('--enhance', action='store_true', help='Улучшить качество изображения')
    parser.add_argument('--output', help='Путь к выходному JSON файлу')
    
    args = parser.parse_args()
    
    # Проверяем существование входного файла
    if not os.path.exists(args.input):
        logger.error(f"Входной файл не найден: {args.input}")
        sys.exit(1)
    
    # Создаем OCR объект
    ocr = SimpleOCR()
    
    # Распознаем текст
    result = ocr.recognize_text(args.input, enhance=args.enhance)
    
    # Выводим результат
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        logger.info(f"Результат сохранен в {args.output}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    if result['success']:
        logger.info(f"Распознавание завершено успешно за {result['processing_time']}")
        logger.info(f"Уверенность: {result['confidence']}%")
        logger.info(f"Распознанный текст:\n{result['text']}")
    else:
        logger.error(f"Ошибка распознавания: {result['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main() 