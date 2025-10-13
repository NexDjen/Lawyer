#!/usr/bin/env python3
"""
Mock backend сервер для Windex-Юрист
Запускает простой HTTP сервер, который имитирует API ответы и обслуживает статические файлы
"""

import json
import os
import http.server
import socketserver
from urllib.parse import parse_qs, urlparse

PORT = 3000  # Изменяем порт на 3000 для frontend

class MockHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Устанавливаем рабочую директорию на build папку
        super().__init__(*args, directory='build', **kwargs)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # API маршруты
        if path.startswith('/api/'):
            self.handle_api_request()
        else:
            # Обслуживаем статические файлы из build директории
            super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/'):
            self.handle_api_request()
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        # Обрабатываем CORS preflight запросы
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def handle_api_request(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        # Определяем ответ на основе пути
        if path == '/api/chat':
            response = {
                'success': True,
                'message': 'Добро пожаловать в Windex-Юрист!',
                'data': {
                    'response': 'Привет! Я ваш AI-юридический помощник. Чем могу помочь?',
                    'timestamp': '2024-01-01T00:00:00Z'
                }
            }
        elif path == '/api/documents':
            response = {
                'success': True,
                'documents': [
                    {
                        'id': 1,
                        'name': 'Пример документа.pdf',
                        'type': 'pdf',
                        'size': '2.5 MB',
                        'uploaded': '2024-01-01'
                    }
                ]
            }
        elif path == '/api/profile':
            response = {
                'success': True,
                'profile': {
                    'name': 'Пользователь',
                    'email': 'user@example.com',
                    'balance': 100.0
                }
            }
        elif path == '/api/admin/stats':
            response = {
                'success': True,
                'stats': {
                    'total_users': 100,
                    'total_documents': 50,
                    'total_chats': 200,
                    'system_load': 15.5
                }
            }
        else:
            response = {
                'success': True,
                'message': f'API endpoint {path} обработан mock сервером'
            }

        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        # Отключаем логирование для чистоты вывода
        pass

if __name__ == "__main__":
    print(f"🚀 Запускаем объединенный сервер на порту {PORT}")
    print(f"📡 Frontend доступен по адресу: http://localhost:{PORT}")
    print(f"🔗 API доступен по адресу: http://localhost:{PORT}/api/")
    print(f"📁 Статические файлы обслуживаются из директории: build/")

    with socketserver.TCPServer(("", PORT), MockHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Сервер остановлен")
