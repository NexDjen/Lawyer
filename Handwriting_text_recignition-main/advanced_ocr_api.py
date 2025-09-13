#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import sys
import os
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import torch
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AdvancedOCR:
    def __init__(self):
        self.processor = None
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.initialize_models()
    
    def initialize_models(self):
        """Инициализация моделей для различных типов распознавания"""
        try:
            # Инициализация TrOCR для рукописного текста
            logger.info("Загрузка TrOCR модели для рукописного текста...")
            self.processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
            self.model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')
            self.model.to(self.device)
            logger.info("TrOCR модель загружена успешно")
        except Exception as e:
            logger.warning(f"Не удалось загрузить TrOCR модель: {e}")
            self.processor = None
            self.model = None
    
    def enhance_image(self, image_path):
        """Улучшение качества изображения"""
        try:
            # Загружаем изображение
            image = Image.open(image_path)
            
            # Конвертируем в RGB если нужно
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Применяем улучшения
            # 1. Увеличиваем контрастность
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # 2. Увеличиваем резкость
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.3)
            
            # 3. Увеличиваем яркость
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.1)
            
            # 4. Применяем фильтр для уменьшения шума
            image = image.filter(ImageFilter.MedianFilter(size=3))
            
            logger.info("Изображение улучшено")
            return image
            
        except Exception as e:
            logger.error(f"Ошибка при улучшении изображения: {e}")
            return Image.open(image_path)
    
    def preprocess_for_handwriting(self, image):
        """Предобработка для рукописного текста"""
        try:
            # Конвертируем в numpy array
            img_array = np.array(image)
            
            # Конвертируем в оттенки серого
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Применяем адаптивную пороговую обработку
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Удаляем шум
            kernel = np.ones((1, 1), np.uint8)
            binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # Инвертируем цвета (белый текст на черном фоне)
            binary = cv2.bitwise_not(binary)
            
            return Image.fromarray(binary)
            
        except Exception as e:
            logger.error(f"Ошибка при предобработке для рукописного текста: {e}")
            return image
    
    def preprocess_for_text(self, image):
        """Предобработка для печатного текста"""
        try:
            # Конвертируем в numpy array
            img_array = np.array(image)
            
            # Конвертируем в оттенки серого
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Применяем пороговую обработку Оцу
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Удаляем шум
            kernel = np.ones((1, 1), np.uint8)
            binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            return Image.fromarray(binary)
            
        except Exception as e:
            logger.error(f"Ошибка при предобработке для печатного текста: {e}")
            return image
    
    def preprocess_for_table(self, image):
        """Предобработка для таблиц"""
        try:
            # Конвертируем в numpy array
            img_array = np.array(image)
            
            # Конвертируем в оттенки серого
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Применяем пороговую обработку
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Удаляем горизонтальные и вертикальные линии
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
            
            horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)
            vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)
            
            # Удаляем линии из изображения
            table_image = cv2.add(binary, horizontal_lines)
            table_image = cv2.add(table_image, vertical_lines)
            
            return Image.fromarray(table_image)
            
        except Exception as e:
            logger.error(f"Ошибка при предобработке для таблиц: {e}")
            return image
    
    def recognize_handwriting(self, image):
        """Распознавание рукописного текста с помощью TrOCR"""
        try:
            if self.model is None or self.processor is None:
                logger.warning("TrOCR модель не загружена, используем Tesseract")
                return self.recognize_with_tesseract(image, 'rus+eng', '6', '3')
            
            # Предобработка для рукописного текста
            processed_image = self.preprocess_for_handwriting(image)
            
            # Подготавливаем изображение для модели
            pixel_values = self.processor(processed_image, return_tensors="pt").pixel_values
            pixel_values = pixel_values.to(self.device)
            
            # Генерируем текст
            with torch.no_grad():
                generated_ids = self.model.generate(pixel_values)
                generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            logger.info(f"TrOCR распознал текст: {generated_text[:100]}...")
            return {
                'text': generated_text,
                'confidence': 0.85,  # TrOCR обычно дает высокую точность
                'language': 'ru',
                'wordCount': len(generated_text.split())
            }
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании рукописного текста: {e}")
            # Fallback к Tesseract
            return self.recognize_with_tesseract(image, 'rus+eng', '6', '3')
    
    def recognize_with_tesseract(self, image, lang='rus+eng', psm='3', oem='3'):
        """Распознавание с помощью Tesseract"""
        try:
            # Настройка Tesseract
            custom_config = f'--oem {oem} --psm {psm} -l {lang}'
            
            # Распознавание текста
            text = pytesseract.image_to_string(image, config=custom_config)
            
            # Получение данных о достоверности
            data = pytesseract.image_to_data(image, config=custom_config, output_type=pytesseract.Output.DICT)
            
            # Вычисление средней достоверности
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) / 100.0 if confidences else 0.5
            
            # Определение языка
            detected_lang = 'ru' if any(ord(char) > 127 for char in text) else 'en'
            
            # Подсчет слов
            word_count = len(text.split())
            
            logger.info(f"Tesseract распознал текст: {text[:100]}...")
            logger.info(f"Достоверность: {avg_confidence:.2f}, Слов: {word_count}")
            
            return {
                'text': text.strip(),
                'confidence': avg_confidence,
                'language': detected_lang,
                'wordCount': word_count
            }
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании Tesseract: {e}")
            return {
                'text': '',
                'confidence': 0.0,
                'language': 'unknown',
                'wordCount': 0
            }
    
    def recognize_text(self, image, enhance=False):
        """Распознавание печатного текста"""
        try:
            if enhance:
                image = self.enhance_image(image)
            
            processed_image = self.preprocess_for_text(image)
            return self.recognize_with_tesseract(processed_image, 'rus+eng', '6', '3')
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании печатного текста: {e}")
            return self.recognize_with_tesseract(image, 'rus+eng', '6', '3')
    
    def recognize_table(self, image, enhance=False):
        """Распознавание таблиц"""
        try:
            if enhance:
                image = self.enhance_image(image)
            
            processed_image = self.preprocess_for_table(image)
            return self.recognize_with_tesseract(processed_image, 'rus+eng', '6', '3')
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании таблиц: {e}")
            return self.recognize_with_tesseract(image, 'rus+eng', '6', '3')
    
    def auto_recognize(self, image, enhance=False):
        """Автоматическое определение типа и распознавание"""
        try:
            if enhance:
                image = self.enhance_image(image)
            
            # Пробуем разные методы и выбираем лучший результат
            results = []
            
            # Печатный текст
            text_result = self.recognize_text(image, enhance=False)
            results.append(('text', text_result))
            
            # Рукописный текст
            if self.model is not None:
                handwriting_result = self.recognize_handwriting(image)
                results.append(('handwriting', handwriting_result))
            
            # Таблица
            table_result = self.recognize_table(image, enhance=False)
            results.append(('table', table_result))
            
            # Выбираем результат с наивысшей достоверностью
            best_result = max(results, key=lambda x: x[1]['confidence'])
            
            logger.info(f"Автоопределение выбрало тип: {best_result[0]}")
            return best_result[1]
            
        except Exception as e:
            logger.error(f"Ошибка при автоопределении: {e}")
            return self.recognize_with_tesseract(image, 'rus+eng', '3', '3')
    
    def recognize(self, image_path, scan_type='auto', enhance=False):
        """Основная функция распознавания"""
        try:
            logger.info(f"Начинаем распознавание: тип={scan_type}, улучшение={enhance}")
            
            # Загружаем изображение
            image = Image.open(image_path)
            
            # Выбираем метод распознавания
            if scan_type == 'handwriting':
                result = self.recognize_handwriting(image)
            elif scan_type == 'text':
                result = self.recognize_text(image, enhance)
            elif scan_type == 'table':
                result = self.recognize_table(image, enhance)
            else:  # auto
                result = self.auto_recognize(image, enhance)
            
            logger.info("Распознавание завершено успешно")
            return result
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании: {e}")
            return {
                'text': f'Ошибка распознавания: {str(e)}',
                'confidence': 0.0,
                'language': 'unknown',
                'wordCount': 0
            }

def main():
    parser = argparse.ArgumentParser(description='Advanced OCR API')
    parser.add_argument('--image', required=True, help='Path to image file')
    parser.add_argument('--scan-type', default='auto', choices=['auto', 'text', 'handwriting', 'table'], 
                       help='Type of scanning')
    parser.add_argument('--enhance', action='store_true', help='Enhance image quality')
    parser.add_argument('--lang', default='rus+eng', help='Language for Tesseract')
    parser.add_argument('--psm', default='3', help='Page segmentation mode')
    parser.add_argument('--oem', default='3', help='OCR Engine mode')
    
    args = parser.parse_args()
    
    # Проверяем существование файла
    if not os.path.exists(args.image):
        print(json.dumps({
            'error': f'Файл не найден: {args.image}',
            'text': '',
            'confidence': 0.0,
            'language': 'unknown',
            'wordCount': 0
        }))
        sys.exit(1)
    
    try:
        # Инициализируем OCR
        ocr = AdvancedOCR()
        
        # Выполняем распознавание
        result = ocr.recognize(args.image, args.scan_type, args.enhance)
        
        # Выводим результат в JSON
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        print(json.dumps({
            'error': str(e),
            'text': '',
            'confidence': 0.0,
            'language': 'unknown',
            'wordCount': 0
        }))
        sys.exit(1)

if __name__ == '__main__':
    main() 