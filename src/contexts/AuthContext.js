import React, { createContext, useContext, useState, useEffect } from 'react';

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
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    }
    setIsLoading(false);
  }, []);

  // Получение всех пользователей из localStorage
  const getUsers = () => {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  };

  // Сохранение пользователей в localStorage
  const saveUsers = (users) => {
    localStorage.setItem('users', JSON.stringify(users));
  };

  // Обновление текущего пользователя и синхронизация с localStorage
  const updateCurrentUser = (updates) => {
    if (!user) return null;
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex === -1) return null;

    const updatedUser = { ...users[userIndex], ...updates };
    users[userIndex] = updatedUser;
    saveUsers(users);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  };

  // Регистрация пользователя
  const register = (userData) => {
    const users = getUsers();

    // Проверяем, существует ли уже такой email
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Создаем нового пользователя
    const newUser = {
      id: Date.now().toString(),
      email: userData.email,
      password: userData.password, // В реальном приложении пароль должен быть зашифрован
      name: userData.name,
      userType: userData.userType || 'individual', // 'individual' или 'legal'
      role: userData.email === 'admin@layer.com' ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      walletAddress: '',
      walletBalance: 0,

      dailyMessages: 0,
      lastUsageDate: new Date().toISOString().slice(0, 10)
    };

    // Добавляем данные для юридического лица
    if (userData.userType === 'legal') {
      newUser.companyName = userData.companyName;
      newUser.inn = userData.inn;
      newUser.ogrn = userData.ogrn;
      newUser.contactPerson = userData.contactPerson;
      newUser.position = userData.position;
    }

    // Если это первый пользователь, делаем его администратором
    if (users.length === 0) {
      newUser.role = 'admin';
    }

    users.push(newUser);
    saveUsers(users);

    return newUser;
  };

  // Авторизация пользователя
  const login = (email, password) => {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    // Очищаем данные чата предыдущего пользователя для обеспечения приватности
    localStorage.removeItem('chat_sessions');
    localStorage.removeItem('ai_lawyer_messages');

    // Сохраняем текущего пользователя
    localStorage.setItem('currentUser', JSON.stringify(user));
    setUser(user);
    
    return user;
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
  const getAllUsers = () => {
    if (!isAdmin()) {
      throw new Error('Доступ запрещен');
    }
    return getUsers();
  };

  // Удаление пользователя (только для админа)
  const deleteUser = (userId) => {
    if (!isAdmin()) {
      throw new Error('Доступ запрещен');
    }
    
    const users = getUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    saveUsers(filteredUsers);
  };

  // Изменение роли пользователя (только для админа)
  const changeUserRole = (userId, newRole) => {
    if (!isAdmin()) {
      throw new Error('Доступ запрещен');
    }
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].role = newRole;
      saveUsers(users);
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
    updateCurrentUser,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 