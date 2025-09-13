#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import sys
import os
import subprocess
import logging
from datetime import datetime
import tempfile

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BasicOCR:
    def __init__(self):
        # Проверяем доступность Tesseract
        try:
            result = subprocess.run(['tesseract', '--version'], 
                                  capture_output=True, text=True, check=True)
            logger.info("Tesseract доступен")
            logger.info(f"Версия Tesseract: {result.stdout.split()[1]}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Tesseract не найден: {e}")
            sys.exit(1)
        except FileNotFoundError:
            logger.error("Tesseract не установлен. Установите tesseract-ocr")
            sys.exit(1)
    
    def preprocess_image(self, image_path):
        """Предобработка изображения с помощью ImageMagick"""
        try:
            # Проверяем доступность ImageMagick
            subprocess.run(['convert', '--version'], 
                         capture_output=True, check=True)
            
            # Создаем временный файл для обработанного изображения
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                processed_path = tmp_file.name
            
            # Применяем предобработку с помощью ImageMagick
            commands = [
                # Увеличиваем размер изображения
                ['convert', image_path, '-resize', '200%', processed_path],
                # Улучшаем контрастность
                ['convert', processed_path, '-contrast-stretch', '0x100%', processed_path],
                # Увеличиваем резкость
                ['convert', processed_path, '-unsharp', '0x1+0.5+0', processed_path],
                # Нормализуем яркость
                ['convert', processed_path, '-normalize', processed_path],
                # Конвертируем в оттенки серого
                ['convert', processed_path, '-colorspace', 'Gray', processed_path],
                # Применяем пороговую обработку
                ['convert', processed_path, '-threshold', '50%', processed_path]
            ]
            
            for cmd in commands:
                subprocess.run(cmd, check=True)
            
            logger.info("Изображение предобработано с помощью ImageMagick")
            return processed_path
            
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("ImageMagick не найден, используем оригинальное изображение")
            return image_path
        except Exception as e:
            logger.warning(f"Ошибка предобработки: {e}, используем оригинальное изображение")
            return image_path
    
    def recognize_text(self, image_path, enhance=False):
        """Распознавание текста с различными настройками"""
        start_time = datetime.now()
        
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Файл не найден: {image_path}")
            
            # Предобрабатываем изображение если нужно
            if enhance:
                processed_image = self.preprocess_image(image_path)
            else:
                processed_image = image_path
            
            # Пробуем разные конфигурации Tesseract
            configs = [
                # Основная конфигурация для русского текста
                ['tesseract', processed_image, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus+eng'],
                # Альтернативная конфигурация для печатного текста
                ['tesseract', processed_image, 'stdout', '--oem', '3', '--psm', '3', '-l', 'rus+eng'],
                # Конфигурация для рукописного текста
                ['tesseract', processed_image, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus+eng'],
                # Простая конфигурация
                ['tesseract', processed_image, 'stdout', '--oem', '1', '--psm', '6', '-l', 'rus+eng'],
                # Конфигурация для автоматического определения страницы
                ['tesseract', processed_image, 'stdout', '--oem', '3', '--psm', '0', '-l', 'rus+eng'],
                # Конфигурация только для русского
                ['tesseract', processed_image, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus'],
                # Конфигурация только для английского
                ['tesseract', processed_image, 'stdout', '--oem', '3', '--psm', '6', '-l', 'eng'],
                # Конфигурация для рукописного текста с другим PSM
                ['tesseract', processed_image, 'stdout', '--oem', '3', '--psm', '8', '-l', 'rus+eng']
            ]
            
            best_result = ""
            best_length = 0
            
            for i, config in enumerate(configs):
                try:
                    logger.info(f"Пробуем конфигурацию {i+1}: {' '.join(config[3:])}")
                    
                    # Запускаем Tesseract
                    result = subprocess.run(config, 
                                          capture_output=True, 
                                          text=True, 
                                          timeout=30)
                    
                    if result.returncode == 0:
                        text = result.stdout.strip()
                        length = len(text)
                        
                        logger.info(f"Результат {i+1}: длина текста: {length}")
                        if length > 0:
                            logger.info(f"Текст: {text[:100]}...")
                        
                        # Выбираем лучший результат (с наибольшей длиной)
                        if length > best_length and length > 5:
                            best_result = text
                            best_length = length
                    
                except subprocess.TimeoutExpired:
                    logger.warning(f"Таймаут для конфигурации {i+1}")
                    continue
                except Exception as e:
                    logger.warning(f"Ошибка с конфигурацией {i+1}: {e}")
                    continue
            
            # Если все конфигурации не дали хорошего результата, пробуем простой подход
            if not best_result or best_length < 10:
                logger.info("Пробуем простой подход без дополнительных настроек")
                try:
                    simple_config = ['tesseract', processed_image, 'stdout', '-l', 'rus+eng']
                    result = subprocess.run(simple_config, 
                                          capture_output=True, 
                                          text=True, 
                                          timeout=30)
                    
                    if result.returncode == 0:
                        simple_text = result.stdout.strip()
                        if len(simple_text) > len(best_result):
                            best_result = simple_text
                            best_length = len(simple_text)
                except Exception as e:
                    logger.warning(f"Ошибка простого распознавания: {e}")
            
            processing_time = datetime.now() - start_time
            
            # Удаляем временный файл если он был создан
            if enhance and processed_image != image_path and os.path.exists(processed_image):
                try:
                    os.unlink(processed_image)
                except:
                    pass
            
            return {
                "success": True,
                "text": best_result,
                "text_length": best_length,
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
    parser = argparse.ArgumentParser(description='Базовый OCR для распознавания текста')
    parser.add_argument('input', help='Путь к входному изображению')
    parser.add_argument('--enhance', action='store_true', help='Улучшить качество изображения')
    parser.add_argument('--output', help='Путь к выходному JSON файлу')
    
    args = parser.parse_args()
    
    # Проверяем существование входного файла
    if not os.path.exists(args.input):
        logger.error(f"Входной файл не найден: {args.input}")
        sys.exit(1)
    
    # Создаем OCR объект
    ocr = BasicOCR()
    
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
        logger.info(f"Длина текста: {result['text_length']}")
        logger.info(f"Распознанный текст:\n{result['text']}")
    else:
        logger.error(f"Ошибка распознавания: {result['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main() 