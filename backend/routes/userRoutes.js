const express = require('express');
const router = express.Router();
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware для проверки авторизации (упрощенная версия)
const requireAuth = (req, res, next) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }
  req.userId = userId;
  next();
};

// Middleware для проверки прав администратора
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Ошибка проверки прав доступа' });
  }
};

// Получение профиля пользователя
router.get('/:userId/profile', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем, что пользователь запрашивает свой профиль или является админом
    if (req.userId !== userId) {
      const currentUser = await User.findById(req.userId);
      if (!currentUser || !currentUser.isAdmin()) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const profile = await user.getProfile();

    res.json({
      success: true,
      user: user.toJSON(),
      profile
    });

  } catch (error) {
    logger.error('Ошибка получения профиля:', error);
    res.status(500).json({
      error: 'Ошибка при получении профиля',
      details: error.message
    });
  }
});

// Обновление профиля пользователя
router.put('/:userId/profile', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { personalData, caseNotes, preferences } = req.body;

    // Проверяем, что пользователь обновляет свой профиль
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const updatedProfile = await user.updateProfile({
      personalData,
      caseNotes,
      preferences
    });

    res.json({
      success: true,
      profile: updatedProfile,
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
router.get('/:userId/stats', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем, что пользователь запрашивает свою статистику или является админом
    if (req.userId !== userId) {
      const currentUser = await User.findById(req.userId);
      if (!currentUser || !currentUser.isAdmin()) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
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

// Обновление персональных данных
router.put('/:userId/personal-data', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { personalData } = req.body;

    // Проверяем, что пользователь обновляет свои данные
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const profile = await user.getProfile();
    const updatedProfile = await user.updateProfile({
      ...profile,
      personalData
    });

    res.json({
      success: true,
      profile: updatedProfile,
      message: 'Персональные данные обновлены'
    });

  } catch (error) {
    logger.error('Ошибка обновления персональных данных:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении персональных данных',
      details: error.message
    });
  }
});

// Добавление заметки о деле
router.post('/:userId/case-notes', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { caseNote } = req.body;

    // Проверяем, что пользователь добавляет заметку к своему профилю
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const profile = await user.getProfile();
    const updatedCaseNotes = [...profile.caseNotes, {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: caseNote.content,
      importance: caseNote.importance || 5,
      tags: caseNote.tags || [],
      createdAt: new Date().toISOString()
    }];

    const updatedProfile = await user.updateProfile({
      ...profile,
      caseNotes: updatedCaseNotes
    });

    res.json({
      success: true,
      note: updatedCaseNotes[updatedCaseNotes.length - 1],
      message: 'Заметка добавлена'
    });

  } catch (error) {
    logger.error('Ошибка добавления заметки:', error);
    res.status(500).json({
      error: 'Ошибка при добавлении заметки',
      details: error.message
    });
  }
});

// Получение заметок о делах
router.get('/:userId/case-notes', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем, что пользователь запрашивает свои заметки или является админом
    if (req.userId !== userId) {
      const currentUser = await User.findById(req.userId);
      if (!currentUser || !currentUser.isAdmin()) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const profile = await user.getProfile();

    res.json({
      success: true,
      notes: profile.caseNotes
    });

  } catch (error) {
    logger.error('Ошибка получения заметок:', error);
    res.status(500).json({
      error: 'Ошибка при получении заметок',
      details: error.message
    });
  }
});

// Удаление пользователя (только для админа)
router.delete('/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Нельзя удалить самого себя
    if (req.userId === userId) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    await user.delete();

    res.json({
      success: true,
      message: 'Пользователь успешно удален'
    });

  } catch (error) {
    logger.error('Ошибка удаления пользователя:', error);
    res.status(500).json({
      error: 'Ошибка при удалении пользователя',
      details: error.message
    });
  }
});

// Изменение роли пользователя (только для админа)
router.put('/:userId/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Неверная роль пользователя' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Нельзя изменить роль самого себя
    if (req.userId === userId) {
      return res.status(400).json({ error: 'Нельзя изменить роль самого себя' });
    }

    const updatedUser = await User.changeRole(userId, role);

    res.json({
      success: true,
      user: updatedUser.toJSON(),
      message: 'Роль пользователя изменена'
    });

  } catch (error) {
    logger.error('Ошибка изменения роли:', error);
    res.status(500).json({
      error: 'Ошибка при изменении роли',
      details: error.message
    });
  }
});

module.exports = router;
