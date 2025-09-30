const express = require('express');
const router = express.Router();
const UserProfileService = require('../services/userProfileService');
const PersonalDataExtractor = require('../services/personalDataExtractor');
const logger = require('../utils/logger');

const profileService = new UserProfileService();
const dataExtractor = new PersonalDataExtractor();

/**
 * Получить профиль пользователя
 * GET /api/profile/:userId
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID пользователя обязателен',
        timestamp: new Date().toISOString()
      });
    }
    
    const profile = await profileService.getUserProfile(userId);
    const statistics = await profileService.getProfileStatistics(userId);
    
    // Маскируем чувствительные данные для передачи на фронтенд
    const safePProfile = {
      ...profile,
      personalData: {
        ...profile.personalData,
        // Маскируем чувствительные поля
        passportSeries: profile.personalData.passportSeries ? 
          dataExtractor.maskSensitiveData(profile.personalData.passportSeries, 'passportSeries') : '',
        passportNumber: profile.personalData.passportNumber ? 
          dataExtractor.maskSensitiveData(profile.personalData.passportNumber, 'passportNumber') : '',
        inn: profile.personalData.inn ? 
          dataExtractor.maskSensitiveData(profile.personalData.inn, 'inn') : '',
        snils: profile.personalData.snils ? 
          dataExtractor.maskSensitiveData(profile.personalData.snils, 'snils') : ''
      },
      statistics
    };
    
    res.json(safePProfile);
    
  } catch (error) {
    logger.error('Ошибка получения профиля пользователя', {
      userId: profileService.maskUserId(req.params.userId),
      error: error.message
    });
    
    res.status(500).json({
      error: 'Ошибка получения профиля пользователя',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Обновить профиль пользователя
 * PUT /api/profile/:userId
 */
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID пользователя обязателен',
        timestamp: new Date().toISOString()
      });
    }
    
    // Валидация и санитизация входных данных
    const sanitizedUpdates = {};
    
    if (updates.personalData) {
      sanitizedUpdates.personalData = {};
      
      // Разрешенные поля для обновления
      const allowedFields = [
        'fullName', 'firstName', 'lastName', 'middleName',
        'birthDate', 'birthPlace', 'phone', 'email', 'address',
        'passportSeries', 'passportNumber', 'inn', 'snils',
        'maritalStatus', 'occupation', 'workplace'
      ];
      
      for (const field of allowedFields) {
        if (updates.personalData[field] !== undefined) {
          // Нормализуем данные
          sanitizedUpdates.personalData[field] = dataExtractor.normalizeData(
            updates.personalData[field], 
            field
          );
        }
      }
    }
    
    if (updates.preferences) {
      sanitizedUpdates.preferences = {
        autoSavePersonalData: updates.preferences.autoSavePersonalData !== false,
        dataRetentionDays: Math.max(30, Math.min(updates.preferences.dataRetentionDays || 365, 365)),
        privacyLevel: ['low', 'standard', 'high'].includes(updates.preferences.privacyLevel) 
          ? updates.preferences.privacyLevel 
          : 'standard'
      };
    }
    
    const updatedProfile = await profileService.updateUserProfile(userId, sanitizedUpdates);
    const statistics = await profileService.getProfileStatistics(userId);
    
    res.json({
      success: true,
      profile: updatedProfile,
      statistics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Ошибка обновления профиля пользователя', {
      userId: profileService.maskUserId(req.params.userId),
      error: error.message
    });
    
    res.status(500).json({
      error: 'Ошибка обновления профиля пользователя',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Добавить заметку о деле
 * POST /api/profile/:userId/case-note
 */
router.post('/:userId/case-note', async (req, res) => {
  try {
    const { userId } = req.params;
    const { content, importance = 5 } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ 
        error: 'ID пользователя и содержание заметки обязательны',
        timestamp: new Date().toISOString()
      });
    }
    
    const updatedProfile = await profileService.addCaseNote(userId, content, importance);
    
    res.json({
      success: true,
      message: 'Заметка добавлена',
      caseNoteId: updatedProfile.caseNotes[updatedProfile.caseNotes.length - 1].id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Ошибка добавления заметки о деле', {
      userId: profileService.maskUserId(req.params.userId),
      error: error.message
    });
    
    res.status(500).json({
      error: 'Ошибка добавления заметки о деле',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Получить статистику профиля
 * GET /api/profile/:userId/statistics
 */
router.get('/:userId/statistics', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID пользователя обязателен',
        timestamp: new Date().toISOString()
      });
    }
    
    const statistics = await profileService.getProfileStatistics(userId);
    
    res.json({
      success: true,
      statistics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Ошибка получения статистики профиля', {
      userId: profileService.maskUserId(req.params.userId),
      error: error.message
    });
    
    res.status(500).json({
      error: 'Ошибка получения статистики профиля',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Экспорт данных пользователя
 * GET /api/profile/:userId/export
 */
router.get('/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID пользователя обязателен',
        timestamp: new Date().toISOString()
      });
    }
    
    const exportData = await profileService.exportUserData(userId);
    
    // Устанавливаем заголовки для скачивания файла
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="profile_${userId}_${Date.now()}.json"`);
    
    res.json(exportData);
    
  } catch (error) {
    logger.error('Ошибка экспорта данных пользователя', {
      userId: profileService.maskUserId(req.params.userId),
      error: error.message
    });
    
    res.status(500).json({
      error: 'Ошибка экспорта данных пользователя',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Удалить профиль пользователя
 * DELETE /api/profile/:userId
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { confirm } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID пользователя обязателен',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!confirm) {
      return res.status(400).json({ 
        error: 'Подтверждение удаления обязательно',
        timestamp: new Date().toISOString()
      });
    }
    
    await profileService.deleteUserProfile(userId);
    
    res.json({
      success: true,
      message: 'Профиль пользователя удален',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Ошибка удаления профиля пользователя', {
      userId: profileService.maskUserId(req.params.userId),
      error: error.message
    });
    
    res.status(500).json({
      error: 'Ошибка удаления профиля пользователя',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Тестовое извлечение персональных данных из текста
 * POST /api/profile/extract-test
 */
router.post('/extract-test', async (req, res) => {
  try {
    const { text, existingProfile = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Текст для анализа обязателен',
        timestamp: new Date().toISOString()
      });
    }
    
    const extractedData = dataExtractor.extractPersonalData(text, existingProfile);
    
    res.json({
      success: true,
      extractedData: {
        ...extractedData,
        // Маскируем чувствительные данные в ответе
        personalData: Object.fromEntries(
          Object.entries(extractedData.personalData).map(([key, value]) => [
            key,
            dataExtractor.maskSensitiveData(value, key)
          ])
        )
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Ошибка тестового извлечения данных', { error: error.message });
    
    res.status(500).json({
      error: 'Ошибка тестового извлечения данных',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Очистка старых данных профиля
 * POST /api/profile/:userId/cleanup
 */
router.post('/:userId/cleanup', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID пользователя обязателен',
        timestamp: new Date().toISOString()
      });
    }
    
    await profileService.cleanupOldData(userId);
    
    res.json({
      success: true,
      message: 'Старые данные очищены',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Ошибка очистки старых данных', {
      userId: profileService.maskUserId(req.params.userId),
      error: error.message
    });
    
    res.status(500).json({
      error: 'Ошибка очистки старых данных',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

