import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Инициализация при загрузке
  useEffect(() => {
    // Проверяем localStorage на наличие сохраненного пользователя
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Ошибка парсинга сохраненного пользователя:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Регистрация пользователя
  const register = async (userData) => {
    try {
      const newUser = await userService.register({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.email === 'admin@layer.com' ? 'admin' : 'user'
      });

      // Сохраняем пользователя в localStorage
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      setUser(newUser);
      
      return newUser;
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      throw error;
    }
  };

  // Авторизация пользователя
  const login = async (email, password) => {
    try {
      const userData = await userService.login(email, password);
      
      // Очищаем данные чата предыдущего пользователя для обеспечения приватности
      localStorage.removeItem('chat_sessions');
      localStorage.removeItem('ai_lawyer_messages');

      // Сохраняем текущего пользователя
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setUser(userData);
      
      return userData;
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      throw error;
    }
  };

  // Выход пользователя
  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  // Проверка роли администратора
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  // Получение всех пользователей (только для админа)
  const getAllUsers = async () => {
    if (!isAdmin()) {
      throw new Error('Доступ запрещен');
    }
    try {
      return await userService.getAllUsers();
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      throw error;
    }
  };

  // Удаление пользователя (только для админа)
  const deleteUser = async (userId) => {
    if (!isAdmin()) {
      throw new Error('Доступ запрещен');
    }
    
    try {
      await userService.deleteUser(userId);
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      throw error;
    }
  };

  // Изменение роли пользователя (только для админа)
  const changeUserRole = async (userId, newRole) => {
    if (!isAdmin()) {
      throw new Error('Доступ запрещен');
    }
    
    try {
      await userService.changeUserRole(userId, newRole);
    } catch (error) {
      console.error('Ошибка изменения роли:', error);
      throw error;
    }
  };

  // Обновление профиля пользователя
  const updateProfile = async (profileData) => {
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    try {
      const updatedUser = await userService.updateProfile(user.id, profileData);
      
      // Обновляем локальное состояние
      const newUser = { ...user, ...updatedUser };
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      setUser(newUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      throw error;
    }
  };

  // Получение статистики пользователя
  const getUserStats = async () => {
    if (!user) {
      return null;
    }

    try {
      return await userService.getUserStats(user.id);
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return null;
    }
  };

  const value = {
    user,
    isLoading,
    register,
    login,
    logout,
    isAdmin,
    getAllUsers,
    deleteUser,
    changeUserRole,
    updateProfile,
    getUserStats,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
