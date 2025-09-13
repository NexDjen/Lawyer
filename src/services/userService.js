// Сервис для управления пользователями
export const initializeDemoUsers = () => {
  // Проверяем, есть ли уже пользователи в localStorage
  const existingUsers = localStorage.getItem('users');
  
  if (!existingUsers) {
    // Создаем демо пользователей
    const demoUsers = [
      {
        id: '1',
        email: 'admin@layer.com',
        password: 'admin123',
        name: 'Администратор',
        role: 'admin',
        createdAt: new Date().toISOString(),
        walletAddress: '',
        walletBalance: 0
      },
      {
        id: '2',
        email: 'user@layer.com',
        password: 'user123',
        name: 'Пользователь',
        role: 'user',
        createdAt: new Date().toISOString(),
        walletAddress: '',
        walletBalance: 0,
        // Демо-поля профиля для автозаполнения
        lastName: 'Иванов',
        firstName: 'Иван',
        middleName: 'Иванович',
        fullName: 'Иванов Иван Иванович',
        snils: '123-456-789 00',
        passportSeries: '1234',
        passportNumber: '567890',
        birthDate: '01.01.1990',
        address: 'г. Москва, ул. Пушкина, д. 1',

        dailyMessages: 0,
        lastUsageDate: new Date().toISOString().slice(0, 10)
      }
    ];
    
    localStorage.setItem('users', JSON.stringify(demoUsers));
  }
};

// Функция для получения всех пользователей
export const getAllUsers = () => {
  const users = localStorage.getItem('users');
  return users ? JSON.parse(users) : [];
};

// Функция для получения пользователя по ID
export const getUserById = (userId) => {
  const users = getAllUsers();
  return users.find(user => user.id === userId);
};

// Функция для обновления пользователя
export const updateUser = (userId, updates) => {
  const users = getAllUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...updates };
    localStorage.setItem('users', JSON.stringify(users));
    return users[userIndex];
  }
  
  return null;
};

// Функция для удаления пользователя
export const deleteUser = (userId) => {
  const users = getAllUsers();
  const filteredUsers = users.filter(user => user.id !== userId);
  localStorage.setItem('users', JSON.stringify(filteredUsers));
  return filteredUsers;
};

// Функция для создания нового пользователя
export const createUser = (userData) => {
  const users = getAllUsers();
  const newUser = {
    id: Date.now().toString(),
    ...userData,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  return newUser;
};

// Функция для проверки email на уникальность
export const isEmailUnique = (email, excludeUserId = null) => {
  const users = getAllUsers();
  return !users.some(user => user.email === email && user.id !== excludeUserId);
};

// Функция для аутентификации пользователя
export const authenticateUser = (email, password) => {
  const users = getAllUsers();
  return users.find(user => user.email === email && user.password === password);
};

// Функция для получения статистики пользователей
export const getUserStats = () => {
  const users = getAllUsers();
  
  return {
    totalUsers: users.length,
    adminCount: users.filter(user => user.role === 'admin').length,
    userCount: users.filter(user => user.role === 'user').length,
    recentUsers: users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  };
}; 