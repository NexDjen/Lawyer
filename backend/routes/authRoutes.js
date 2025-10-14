const express = require('express');
const router = express.Router();
const User = require('../models/User');
const logger = require('../utils/logger');

// Регистрация пользователя
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Валидация входных данных
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Необходимо указать имя, email и пароль'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Пароль должен содержать минимум 6 символов'
      });
    }

    // Создаем пользователя
    const user = await User.create({ name, email, password, role });

    logger.info('✅ Пользователь зарегистрирован:', { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });

    res.status(201).json({
      success: true,
      user: user.toJSON(),
      message: 'Пользователь успешно зарегистрирован'
    });

  } catch (error) {
    logger.error('Ошибка регистрации:', error);
    
    if (error.message.includes('уже существует')) {
      return res.status(409).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Ошибка при регистрации пользователя',
      details: error.message
    });
  }
});

// Авторизация пользователя
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация входных данных
    if (!email || !password) {
      return res.status(400).json({
        error: 'Необходимо указать email и пароль'
      });
    }

    // Аутентификация пользователя
    const user = await User.authenticate(email, password);

    logger.info('✅ Пользователь авторизован:', { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });

    res.json({
      success: true,
      user: user.toJSON(),
      message: 'Успешная авторизация'
    });

  } catch (error) {
    logger.error('Ошибка авторизации:', error);
    
    if (error.message.includes('не найден') || error.message.includes('Неверный пароль')) {
      return res.status(401).json({
        error: 'Неверный email или пароль'
      });
    }

    res.status(500).json({
      error: 'Ошибка при авторизации',
      details: error.message
    });
  }
});

// Получение информации о текущем пользователе
router.get('/me', async (req, res) => {
  try {
    // В реальном приложении здесь должна быть проверка JWT токена
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Необходима авторизация'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });

  } catch (error) {
    logger.error('Ошибка получения информации о пользователе:', error);
    res.status(500).json({
      error: 'Ошибка при получении информации о пользователе',
      details: error.message
    });
  }
});

// Обновление профиля пользователя
router.put('/me', async (req, res) => {
  try {
    const { userId } = req.query;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Необходима авторизация'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      user: updatedUser.toJSON(),
      message: 'Профиль успешно обновлен'
    });

  } catch (error) {
    logger.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении профиля',
      details: error.message
    });
  }
});

// Получение статистики пользователя
router.get('/me/stats', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Необходима авторизация'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    const stats = await user.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Ошибка получения статистики пользователя:', error);
    res.status(500).json({
      error: 'Ошибка при получении статистики',
      details: error.message
    });
  }
});

module.exports = router;
