import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.baseURL;

class UserService {
  // Регистрация пользователя
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка регистрации');
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      throw error;
    }
  }

  // Авторизация пользователя
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка авторизации');
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      throw error;
    }
  }

  // Получение всех пользователей (только для админа)
  async getAllUsers() {
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
      return result.users;
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      throw error;
    }
  }

  // Удаление пользователя
  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
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
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
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

  // Обновление профиля пользователя
  async updateProfile(userId, profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      throw error;
    }
  }

  // Получение статистики пользователя
  async getUserStats(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения статистики');
      }

      const result = await response.json();
      return result.stats;
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return null;
    }
  }

  // Получение профиля пользователя
  async getUserProfile(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения профиля');
      }

      const result = await response.json();
      return result.profile;
    } catch (error) {
      console.error('Ошибка получения профиля:', error);
      return null;
    }
  }

  // Обновление персональных данных
  async updatePersonalData(userId, personalData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/personal-data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personalData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка обновления персональных данных');
      }

      const result = await response.json();
      return result.profile;
    } catch (error) {
      console.error('Ошибка обновления персональных данных:', error);
      throw error;
    }
  }

  // Добавление заметки о деле
  async addCaseNote(userId, caseNote) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/case-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseNote }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка добавления заметки');
      }

      const result = await response.json();
      return result.note;
    } catch (error) {
      console.error('Ошибка добавления заметки:', error);
      throw error;
    }
  }

  // Получение заметок о делах
  async getCaseNotes(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/case-notes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения заметок');
      }

      const result = await response.json();
      return result.notes;
    } catch (error) {
      console.error('Ошибка получения заметок:', error);
      return [];
    }
  }
}

export const userService = new UserService();
