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

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HybridOCR:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('GOOGLE_CLOUD_API_KEY')
        self.api_url = "https://vision.googleapis.com/v1/images:annotate"
        
        # Проверяем доступность Tesseract
        try:
            result = subprocess.run(['tesseract', '--version'], 
                                  capture_output=True, text=True, check=True)
            logger.info("Tesseract доступен")
            self.tesseract_available = True
        except:
            logger.warning("Tesseract не найден")
            self.tesseract_available = False
    
    def encode_image(self, image_path):
        """Кодирует изображение в base64"""
        try:
            with open(image_path, 'rb') as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Ошибка при кодировании изображения: {e}")
            return None
    
    def google_vision_ocr(self, image_path):
        """Распознавание текста с помощью Google Cloud Vision API"""
        try:
            if not self.api_key:
                return None
            
            # Кодируем изображение
            image_content = self.encode_image(image_path)
            if not image_content:
                return None
            
            # Подготавливаем запрос к API
            request_data = {
                "requests": [
                    {
                        "image": {
                            "content": image_content
                        },
                        "features": [
                            {
                                "type": "TEXT_DETECTION",
                                "maxResults": 1
                            }
                        ],
                        "imageContext": {
                            "languageHints": ["ru", "en"]
                        }
                    }
                ]
            }
            
            # Отправляем запрос
            logger.info("Отправляем запрос к Google Cloud Vision API...")
            response = requests.post(
                f"{self.api_url}?key={self.api_key}",
                json=request_data,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.warning(f"Ошибка Google Vision API: {response.status_code}")
                return None
            
            # Обрабатываем ответ
            result = response.json()
            
            if 'responses' not in result or not result['responses']:
                return None
            
            response_data = result['responses'][0]
            
            if 'error' in response_data:
                logger.warning(f"Ошибка в ответе Google Vision API: {response_data['error']}")
                return None
            
            # Извлекаем текст
            text = ""
            if 'textAnnotations' in response_data and response_data['textAnnotations']:
                text = response_data['textAnnotations'][0].get('description', '')
            
            return text
            
        except Exception as e:
            logger.warning(f"Ошибка Google Vision API: {e}")
            return None
    
    def tesseract_ocr(self, image_path):
        """Распознавание текста с помощью Tesseract"""
        try:
            if not self.tesseract_available:
                return None
            
            # Пробуем разные конфигурации Tesseract
            configs = [
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus+eng'],
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '3', '-l', 'rus+eng'],
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '6', '-l', 'rus'],
                ['tesseract', image_path, 'stdout', '--oem', '3', '--psm', '6', '-l', 'eng']
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
        """Распознавание текста с помощью гибридного подхода"""
        start_time = datetime.now()
        
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Файл не найден: {image_path}")
            
            # Сначала пробуем Google Vision API
            logger.info("Пробуем Google Cloud Vision API...")
            google_text = self.google_vision_ocr(image_path)
            
            if google_text and len(google_text.strip()) > 10:
                logger.info("✅ Используем результат Google Vision API")
                processing_time = datetime.now() - start_time
                
                return {
                    "success": True,
                    "text": google_text,
                    "text_length": len(google_text),
                    "processing_time": str(processing_time),
                    "input_file": image_path,
                    "api_used": "Google Cloud Vision"
                }
            
            # Если Google Vision не сработал, пробуем Tesseract
            logger.info("Google Vision API не дал результата, пробуем Tesseract...")
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
    parser = argparse.ArgumentParser(description='Гибридный OCR для распознавания текста')
    parser.add_argument('input', help='Путь к входному изображению')
    parser.add_argument('--api-key', help='Google Cloud API ключ')
    parser.add_argument('--enhance', action='store_true', help='Улучшить качество изображения')
    parser.add_argument('--output', help='Путь к выходному JSON файлу')
    
    args = parser.parse_args()
    
    # Проверяем существование входного файла
    if not os.path.exists(args.input):
        logger.error(f"Входной файл не найден: {args.input}")
        sys.exit(1)
    
    # Создаем OCR объект
    ocr = HybridOCR(api_key=args.api_key)
    
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