import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.baseURL;

class AdminService {
  // Получение статистики WindexAI
  async getWindexAIStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/windexai-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения статистики WindexAI');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка получения статистики WindexAI:', error);
      throw error;
    }
  }

  // Получение дневной статистики
  async getDailyStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/daily-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения дневной статистики');
      }

      const result = await response.json();
      return result.stats || [];
    } catch (error) {
      console.error('Ошибка получения дневной статистики:', error);
      return [];
    }
  }

  // Получение всех пользователей
  async getUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения пользователей');
      }

      const result = await response.json();
      return result.users || [];
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      return [];
    }
  }

  // Получение настроек API
  async getAPISettings() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/api-settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения настроек API');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка получения настроек API:', error);
      return null;
    }
  }

  // Получение статистики базы данных
  async getDatabaseStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/database-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения статистики БД');
      }

      const result = await response.json();
      return result.stats || [];
    } catch (error) {
      console.error('Ошибка получения статистики БД:', error);
      return [];
    }
  }

  // Получение детальной админ статистики
  async getAdminStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/admin-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения админ статистики');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка получения админ статистики:', error);
      return null;
    }
  }

  // Сброс статистики
  async resetStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reset-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сброса статистики');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка сброса статистики:', error);
      throw error;
    }
  }

  // Удаление пользователя
  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления пользователя');
      }

      return true;
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      throw error;
    }
  }

  // Изменение роли пользователя
  async changeUserRole(userId, newRole) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка изменения роли');
      }

      return true;
    } catch (error) {
      console.error('Ошибка изменения роли:', error);
      throw error;
    }
  }

  // Экспорт статистики в CSV
  async exportStatsToCSV(startDate, endDate) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/export-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка экспорта статистики');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `windexai-stats-${startDate}-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (error) {
      console.error('Ошибка экспорта статистики:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
