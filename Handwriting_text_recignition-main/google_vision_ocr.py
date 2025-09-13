#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import sys
import os
import logging
from datetime import datetime
import requests
import base64

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class GoogleVisionOCR:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('GOOGLE_CLOUD_API_KEY')
        if not self.api_key:
            logger.warning("Google Cloud API ключ не найден. Используйте переменную GOOGLE_CLOUD_API_KEY или передайте --api-key")
        
        self.api_url = "https://vision.googleapis.com/v1/images:annotate"
    
    def encode_image(self, image_path):
        """Кодирует изображение в base64"""
        try:
            with open(image_path, 'rb') as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Ошибка при кодировании изображения: {e}")
            return None
    
    def recognize_text(self, image_path, enhance=False):
        """Распознавание текста с помощью Google Cloud Vision API"""
        start_time = datetime.now()
        
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Файл не найден: {image_path}")
            
            if not self.api_key:
                return {
                    "success": False,
                    "error": "Google Cloud API ключ не настроен",
                    "processing_time": str(datetime.now() - start_time),
                    "input_file": image_path
                }
            
            # Кодируем изображение
            image_content = self.encode_image(image_path)
            if not image_content:
                return {
                    "success": False,
                    "error": "Не удалось закодировать изображение",
                    "processing_time": str(datetime.now() - start_time),
                    "input_file": image_path
                }
            
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
                logger.error(f"Ошибка API: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"API ошибка: {response.status_code}",
                    "processing_time": str(datetime.now() - start_time),
                    "input_file": image_path
                }
            
            # Обрабатываем ответ
            result = response.json()
            
            if 'responses' not in result or not result['responses']:
                return {
                    "success": False,
                    "error": "Пустой ответ от API",
                    "processing_time": str(datetime.now() - start_time),
                    "input_file": image_path
                }
            
            response_data = result['responses'][0]
            
            if 'error' in response_data:
                logger.error(f"Ошибка в ответе API: {response_data['error']}")
                return {
                    "success": False,
                    "error": f"API ошибка: {response_data['error']}",
                    "processing_time": str(datetime.now() - start_time),
                    "input_file": image_path
                }
            
            # Извлекаем текст
            text = ""
            if 'textAnnotations' in response_data and response_data['textAnnotations']:
                # Первый элемент содержит весь текст
                text = response_data['textAnnotations'][0].get('description', '')
            
            processing_time = datetime.now() - start_time
            
            return {
                "success": True,
                "text": text,
                "text_length": len(text),
                "processing_time": str(processing_time),
                "input_file": image_path,
                "api_used": "Google Cloud Vision"
            }
            
        except requests.exceptions.Timeout:
            logger.error("Таймаут при запросе к API")
            return {
                "success": False,
                "error": "Таймаут при запросе к API",
                "processing_time": str(datetime.now() - start_time),
                "input_file": image_path
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка сети: {e}")
            return {
                "success": False,
                "error": f"Ошибка сети: {e}",
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
    parser = argparse.ArgumentParser(description='Google Cloud Vision OCR для распознавания текста')
    parser.add_argument('input', help='Путь к входному изображению')
    parser.add_argument('--api-key', help='Google Cloud API ключ')
    parser.add_argument('--enhance', action='store_true', help='Улучшить качество изображения (пока не реализовано)')
    parser.add_argument('--output', help='Путь к выходному JSON файлу')
    
    args = parser.parse_args()
    
    # Проверяем существование входного файла
    if not os.path.exists(args.input):
        logger.error(f"Входной файл не найден: {args.input}")
        sys.exit(1)
    
    # Создаем OCR объект
    ocr = GoogleVisionOCR(api_key=args.api_key)
    
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