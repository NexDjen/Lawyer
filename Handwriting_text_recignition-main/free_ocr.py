#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import sys
import os
import subprocess
import logging
from datetime import datetime
import requests
import base64
import time
from PIL import Image
import io

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FreeOCR:
    def __init__(self):
        # Проверяем доступность Tesseract
        try:
            result = subprocess.run(['tesseract', '--version'], 
                                  capture_output=True, text=True, check=True)
            logger.info("Tesseract доступен")
            self.tesseract_available = True
        except:
            logger.warning("Tesseract не найден")
            self.tesseract_available = False
    
    def compress_image(self, image_path, max_size_kb=900):
        """Сжимает изображение до указанного размера в КБ"""
        try:
            with Image.open(image_path) as img:
                # Конвертируем в RGB если нужно
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Начинаем с высокого качества
                quality = 95
                output = io.BytesIO()
                
                while quality > 10:
                    output.seek(0)
                    output.truncate()
                    img.save(output, format='JPEG', quality=quality, optimize=True)
                    
                    size_kb = len(output.getvalue()) / 1024
                    logger.info(f"Качество {quality}%, размер {size_kb:.1f}KB")
                    
                    if size_kb <= max_size_kb:
                        break
                    
                    quality -= 10
                
                # Сохраняем сжатое изображение во временный файл
                temp_path = image_path.replace('.', '_compressed.')
                if temp_path == image_path:
                    temp_path = image_path + '_compressed.jpg'
                
                with open(temp_path, 'wb') as f:
                    f.write(output.getvalue())
                
                logger.info(f"Изображение сжато до {size_kb:.1f}KB, сохранено в {temp_path}")
                return temp_path
                
        except Exception as e:
            logger.warning(f"Ошибка при сжатии изображения: {e}")
            return image_path
    
    def encode_image(self, image_path):
        """Кодирует изображение в base64"""
        try:
            with open(image_path, 'rb') as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Ошибка при кодировании изображения: {e}")
            return None
    
    def ocr_space_api(self, image_path):
        """Распознавание текста с помощью OCR.space API (бесплатный)"""
        try:
            # OCR.space API - бесплатный лимит 500 запросов в день
            api_url = "https://api.ocr.space/parse/image"
            
            # Проверяем размер файла и сжимаем если нужно
            file_size_kb = os.path.getsize(image_path) / 1024
            if file_size_kb > 900:
                logger.info(f"Файл слишком большой ({file_size_kb:.1f}KB), сжимаем...")
                compressed_path = self.compress_image(image_path)
                use_path = compressed_path
            else:
                use_path = image_path
            
            with open(use_path, 'rb') as image_file:
                files = {'image': image_file}
                data = {
                    'apikey': 'K81724188988957',  # Бесплатный ключ
                    'language': 'rus',  # Исправлено: только русский
                    'isOverlayRequired': False,
                    'filetype': 'png',
                    'detectOrientation': True,
                    'scale': True,
                    'OCREngine': 2  # Более точный движок
                }
                
                logger.info("Отправляем запрос к OCR.space API...")
                response = requests.post(api_url, files=files, data=data, timeout=30)
                
                # Удаляем временный сжатый файл если он был создан
                if use_path != image_path:
                    try:
                        os.remove(use_path)
                    except:
                        pass
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get('IsErroredOnProcessing', False):
                        logger.warning(f"Ошибка OCR.space API: {result.get('ErrorMessage', 'Unknown error')}")
                        return None
                    
                    parsed_results = result.get('ParsedResults', [])
                    if parsed_results:
                        text = parsed_results[0].get('ParsedText', '')
                        return text.strip()
                
                logger.warning(f"Ошибка OCR.space API: {response.status_code}")
                return None
                
        except Exception as e:
            logger.warning(f"Ошибка OCR.space API: {e}")
            return None
    
    def ocr_space_api_eng(self, image_path):
        """Распознавание текста с помощью OCR.space API для английского текста"""
        try:
            api_url = "https://api.ocr.space/parse/image"
            
            # Проверяем размер файла и сжимаем если нужно
            file_size_kb = os.path.getsize(image_path) / 1024
            if file_size_kb > 900:
                logger.info(f"Файл слишком большой ({file_size_kb:.1f}KB), сжимаем...")
                compressed_path = self.compress_image(image_path)
                use_path = compressed_path
            else:
                use_path = image_path
            
            with open(use_path, 'rb') as image_file:
                files = {'image': image_file}
                data = {
                    'apikey': 'K81724188988957',
                    'language': 'eng',  # Английский
                    'isOverlayRequired': False,
                    'filetype': 'png',
                    'detectOrientation': True,
                    'scale': True,
                    'OCREngine': 2
                }
                
                logger.info("Отправляем запрос к OCR.space API (английский)...")
                response = requests.post(api_url, files=files, data=data, timeout=30)
                
                # Удаляем временный сжатый файл если он был создан
                if use_path != image_path:
                    try:
                        os.remove(use_path)
                    except:
                        pass
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get('IsErroredOnProcessing', False):
                        return None
                    
                    parsed_results = result.get('ParsedResults', [])
                    if parsed_results:
                        text = parsed_results[0].get('ParsedText', '')
                        return text.strip()
                
                return None
                
        except Exception as e:
            return None
    
    def tesseract_enhanced(self, image_path):
        """Улучшенное распознавание с помощью Tesseract с предобработкой"""
        try:
            if not self.tesseract_available:
                return None
            
            # Создаем временную папку для обработки
            temp_dir = os.path.join(os.path.dirname(image_path), 'temp_ocr')
            if not os.path.exists(temp_dir):
                os.makedirs(temp_dir)
            
            # Копируем изображение во временную папку
            temp_image = os.path.join(temp_dir, 'temp_image.jpg')
            import shutil
            shutil.copy2(image_path, temp_image)
            
            # Пробуем разные конфигурации Tesseract с улучшенными настройками
            configs = [
                # Основная конфигурация для русского текста
                ['tesseract', temp_image, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus+eng', '--dpi', '300'],
                # Конфигурация для печатного текста
                ['tesseract', temp_image, 'stdout', '--oem', '3', '--psm', '3', '-l', 'rus+eng', '--dpi', '300'],
                # Конфигурация для рукописного текста
                ['tesseract', temp_image, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus', '--dpi', '300'],
                # Конфигурация для английского текста
                ['tesseract', temp_image, 'stdout', '--oem', '3', '--psm', '6', '-l', 'eng', '--dpi', '300'],
                # Конфигурация с автоматическим определением страницы
                ['tesseract', temp_image, 'stdout', '--oem', '3', '--psm', '0', '-l', 'rus+eng', '--dpi', '300'],
                # Конфигурация для рукописного текста с другим PSM
                ['tesseract', temp_image, 'stdout', '--oem', '3', '--psm', '8', '-l', 'rus+eng', '--dpi', '300']
            ]
            
            best_result = ""
            best_length = 0
            
            for i, config in enumerate(configs):
                try:
                    logger.info(f"Пробуем Tesseract конфигурацию {i+1}")
                    
                    result = subprocess.run(config, 
                                          capture_output=True, 
                                          text=True, 
                                          timeout=30)
                    
                    if result.returncode == 0:
                        text = result.stdout.strip()
                        length = len(text)
                        
                        if length > best_length and length > 5:
                            best_result = text
                            best_length = length
                    
                except Exception as e:
                    logger.warning(f"Ошибка с Tesseract конфигурацией {i+1}: {e}")
                    continue
            
            # Удаляем временный файл
            try:
                os.remove(temp_image)
            except:
                pass
            
            return best_result if best_result else None
            
        except Exception as e:
            logger.warning(f"Ошибка улучшенного Tesseract OCR: {e}")
            return None
    
    def tesseract_ocr(self, image_path):
        """Распознавание текста с помощью Tesseract (локальный)"""
        try:
            if not self.tesseract_available:
                return None
            
            # Пробуем разные конфигурации Tesseract
            configs = [
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus+eng'],
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '3', '-l', 'rus+eng'],
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus'],
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '6', '-l', 'eng'],
                ['tesseract', image_path, 'stdout', '--oem', '1', '--psm', '6', '-l', 'rus+eng']
            ]
            
            best_result = ""
            best_length = 0
            
            for i, config in enumerate(configs):
                try:
                    logger.info(f"Пробуем Tesseract конфигурацию {i+1}")
                    
                    result = subprocess.run(config, 
                                          capture_output=True, 
                                          text=True, 
                                          timeout=30)
                    
                    if result.returncode == 0:
                        text = result.stdout.strip()
                        length = len(text)
                        
                        if length > best_length and length > 5:
                            best_result = text
                            best_length = length
                    
                except Exception as e:
                    logger.warning(f"Ошибка с Tesseract конфигурацией {i+1}: {e}")
                    continue
            
            return best_result if best_result else None
            
        except Exception as e:
            logger.warning(f"Ошибка Tesseract OCR: {e}")
            return None
    
    def recognize_text(self, image_path, enhance=False):
        """Распознавание текста с помощью бесплатных сервисов"""
        start_time = datetime.now()
        
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Файл не найден: {image_path}")
            
            # Сначала пробуем OCR.space API для русского текста
            logger.info("Пробуем OCR.space API (русский)...")
            ocr_space_text = self.ocr_space_api(image_path)
            
            if ocr_space_text and len(ocr_space_text.strip()) > 10:
                logger.info("✅ Используем результат OCR.space API (русский)")
                processing_time = datetime.now() - start_time
                
                return {
                    "success": True,
                    "text": ocr_space_text,
                    "text_length": len(ocr_space_text),
                    "processing_time": str(processing_time),
                    "input_file": image_path,
                    "api_used": "OCR.space (русский)"
                }
            
            # Если русский не сработал, пробуем английский
            logger.info("OCR.space API (русский) не дал результата, пробуем английский...")
            ocr_space_eng_text = self.ocr_space_api_eng(image_path)
            
            if ocr_space_eng_text and len(ocr_space_eng_text.strip()) > 10:
                logger.info("✅ Используем результат OCR.space API (английский)")
                processing_time = datetime.now() - start_time
                
                return {
                    "success": True,
                    "text": ocr_space_eng_text,
                    "text_length": len(ocr_space_eng_text),
                    "processing_time": str(processing_time),
                    "input_file": image_path,
                    "api_used": "OCR.space (английский)"
                }
            
            # Если внешние API не сработали, пробуем улучшенный Tesseract
            logger.info("Внешние API не дали результата, пробуем улучшенный Tesseract...")
            tesseract_enhanced_text = self.tesseract_enhanced(image_path)
            
            if tesseract_enhanced_text and len(tesseract_enhanced_text.strip()) > 5:
                logger.info("✅ Используем результат улучшенного Tesseract")
                processing_time = datetime.now() - start_time
                
                return {
                    "success": True,
                    "text": tesseract_enhanced_text,
                    "text_length": len(tesseract_enhanced_text),
                    "processing_time": str(processing_time),
                    "input_file": image_path,
                    "api_used": "Tesseract Enhanced"
                }
            
            # Если улучшенный Tesseract не сработал, пробуем обычный
            logger.info("Улучшенный Tesseract не дал результата, пробуем обычный Tesseract...")
            tesseract_text = self.tesseract_ocr(image_path)
            
            if tesseract_text and len(tesseract_text.strip()) > 5:
                logger.info("✅ Используем результат Tesseract")
                processing_time = datetime.now() - start_time
                
                return {
                    "success": True,
                    "text": tesseract_text,
                    "text_length": len(tesseract_text),
                    "processing_time": str(processing_time),
                    "input_file": image_path,
                    "api_used": "Tesseract"
                }
            
            # Если ничего не сработало
            logger.error("Ни один метод OCR не дал результата")
            return {
                "success": False,
                "error": "Не удалось распознать текст ни одним методом",
                "processing_time": str(datetime.now() - start_time),
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
    parser = argparse.ArgumentParser(description='Бесплатный OCR для распознавания текста')
    parser.add_argument('input', help='Путь к входному изображению')
    parser.add_argument('--enhance', action='store_true', help='Улучшить качество изображения')
    parser.add_argument('--output', help='Путь к выходному JSON файлу')
    
    args = parser.parse_args()
    
    # Проверяем существование входного файла
    if not os.path.exists(args.input):
        logger.error(f"Входной файл не найден: {args.input}")
        sys.exit(1)
    
    # Создаем OCR объект
    ocr = FreeOCR()
    
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
        logger.info(f"Использован API: {result.get('api_used', 'Unknown')}")
        logger.info(f"Длина текста: {result['text_length']}")
        logger.info(f"Распознанный текст:\n{result['text']}")
    else:
        logger.error(f"Ошибка распознавания: {result['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main() 