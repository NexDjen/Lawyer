// Сервис для административных функций
import { API_BASE_URL } from '../config/api';

export const adminService = {
  // Получение статистики использования WindexAI
  async getWindexAIStats() {
    try {
      const url = `${API_BASE_URL}/admin/openai-stats`;
      console.log('🔍 Запрос статистики WindexAI к:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📊 Статус ответа:', response.status);
      console.log('📋 Заголовки ответа:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка ответа:', errorText);
        throw new Error(`Ошибка при получении статистики WindexAI: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Получены данные статистики:', data);
      return data;
    } catch (error) {
      console.error('❌ Ошибка при получении статистики WindexAI:', error);
      throw error;
    }
  },

  // Получение детальной статистики по дням
  async getDailyStats() {
    try {
      const url = `${API_BASE_URL}/admin/daily-stats`;
      console.log('🔍 Запрос дневной статистики к:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📊 Статус ответа:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка ответа:', errorText);
        throw new Error(`Ошибка при получении дневной статистики: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Получены данные дневной статистики:', data);
      return data;
    } catch (error) {
      console.error('❌ Ошибка при получении дневной статистики:', error);
      throw error;
    }
  },

  // Сброс статистики
  async resetStats() {
    try {
      const url = `${API_BASE_URL}/admin/reset-stats`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Ошибка при сбросе статистики');
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при сбросе статистики:', error);
      throw error;
    }
  },

  // Получение настроек API
  async getAPISettings() {
    try {
      const url = `${API_BASE_URL}/admin/api-settings`;
      console.log('🔍 Запрос настроек API к:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📊 Статус ответа:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка ответа:', errorText);
        throw new Error(`Ошибка при получении настроек API: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Получены настройки API:', data);
      return data;
    } catch (error) {
      console.error('❌ Ошибка при получении настроек API:', error);
      throw error;
    }
  },

  // Обновление настроек API
  async updateAPISettings(settings) {
    try {
      const url = `${API_BASE_URL}/admin/api-settings`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении настроек API');
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при обновлении настроек API:', error);
      throw error;
    }
  }
}; 