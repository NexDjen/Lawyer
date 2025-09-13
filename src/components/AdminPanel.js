import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Database, RefreshCw, Users, LogOut, Trash2, UserCheck, UserX, DollarSign, ArrowLeft } from 'lucide-react';
import { getKnowledgeStats, forceSyncKnowledgeBase } from '../data/legalKnowledgeBase';
import { adminService } from '../services/adminService';
import './AdminPanel.css';
import { formatCurrencyUSD, formatNumberRu } from '../utils/numberUtils';

const AdminPanel = () => {
  const { user, logout, isAdmin, getAllUsers, deleteUser, changeUserRole } = useAuth();
  const navigate = useNavigate();
  const [knowledgeStats, setKnowledgeStats] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('knowledge');
  const [syncMessage, setSyncMessage] = useState('');
  const [openAIStats, setWindexAIStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [apiSettings, setApiSettings] = useState(null);

  const loadUsers = useCallback(() => {
    try {
      const allUsers = getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
    }
  }, [getAllUsers]);

  const loadKnowledgeStats = useCallback(async () => {
    try {
      const stats = await getKnowledgeStats();
      setKnowledgeStats(stats);
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
    }
  }, []);

  const loadWindexAIStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      console.log('🔄 Загружаем статистику WindexAI...');
      const stats = await adminService.getWindexAIStats();
      console.log('✅ Статистика WindexAI загружена:', stats);
      setWindexAIStats(stats);
    } catch (error) {
      console.error('❌ Ошибка при загрузке статистики WindexAI:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadDailyStats = useCallback(async () => {
    try {
      console.log('🔄 Загружаем дневную статистику...');
      const stats = await adminService.getDailyStats();
      console.log('✅ Дневная статистика загружена:', stats);
      setDailyStats(stats);
    } catch (error) {
      console.error('❌ Ошибка при загрузке дневной статистики:', error);
    }
  }, []);

  const loadAPISettings = useCallback(async () => {
    try {
      console.log('🔄 Загружаем настройки API...');
      const settings = await adminService.getAPISettings();
      console.log('✅ Настройки API загружены:', settings);
      setApiSettings(settings);
    } catch (error) {
      console.error('❌ Ошибка при загрузке настроек API:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 AdminPanel useEffect запущен');
    if (!isAdmin()) {
      console.log('❌ Пользователь не админ, перенаправляем');
      navigate('/');
      return;
    }

    console.log('✅ Пользователь админ, загружаем данные...');
    loadKnowledgeStats();
    loadUsers();
    loadWindexAIStats();
    loadDailyStats();
    loadAPISettings();
  }, [isAdmin, navigate, loadUsers, loadKnowledgeStats, loadWindexAIStats, loadDailyStats, loadAPISettings]);

  const handleSyncKnowledge = useCallback(async () => {
    setIsSyncing(true);
    setSyncMessage('');

    try {
      await forceSyncKnowledgeBase();
      await loadKnowledgeStats();
      setSyncMessage('База знаний успешно синхронизирована!');
    } catch (error) {
      console.error('Ошибка при синхронизации:', error);
      setSyncMessage('Ошибка при синхронизации базы знаний');
    } finally {
      setIsSyncing(false);
    }
  }, [loadKnowledgeStats]);

  const handleDeleteUser = useCallback(async (userId) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
      }
    }
  }, [deleteUser, loadUsers]);

  const handleChangeRole = useCallback(async (userId, newRole) => {
    try {
      changeUserRole(userId, newRole);
      loadUsers();
    } catch (error) {
      console.error('Ошибка при изменении роли:', error);
    }
  }, [changeUserRole, loadUsers]);

  const handleResetStats = useCallback(async () => {
    if (window.confirm('Вы уверены, что хотите сбросить всю статистику? Это действие нельзя отменить.')) {
      try {
        await adminService.resetStats();
        await loadWindexAIStats();
        await loadDailyStats();
        alert('Статистика успешно сброшена!');
      } catch (error) {
        console.error('Ошибка при сбросе статистики:', error);
        alert('Ошибка при сбросе статистики');
      }
    }
  }, [loadWindexAIStats, loadDailyStats]);


  const formatCurrency = formatCurrencyUSD;
  const formatNumber = formatNumberRu;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-title">
          <h1>⚖️ Панель Администратора</h1>
          <p>Добро пожаловать, {user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleBack} className="back-button">
            <ArrowLeft size={20} />
            Назад на сайт
          </button>
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={20} />
            Выйти
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'knowledge' ? 'active' : ''}`}
          onClick={() => setActiveTab('knowledge')}
        >
          <Database size={20} />
          База знаний
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          Пользователи
        </button>
        <button
          className={`tab ${activeTab === 'openai' ? 'active' : ''}`}
          onClick={() => setActiveTab('openai')}
        >
          <DollarSign size={20} />
          WindexAI Статистика
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'knowledge' && (
          <div className="knowledge-panel">
            <div className="panel-section">
              <h3>Статистика базы знаний</h3>
              {knowledgeStats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{knowledgeStats.totalItems}</div>
                    <div className="stat-label">Всего статей</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{knowledgeStats.categoriesCount}</div>
                    <div className="stat-label">Категорий</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{knowledgeStats.lastUpdated}</div>
                    <div className="stat-label">Последнее обновление</div>
                  </div>
                </div>
              )}
            </div>

            <div className="panel-section">
              <h3>Управление базой знаний</h3>
              <div className="action-buttons">
                <button
                  onClick={handleSyncKnowledge}
                  disabled={isSyncing}
                  className="sync-button"
                >
                  <RefreshCw size={20} className={isSyncing ? 'spinning' : ''} />
                  {isSyncing ? 'Синхронизация...' : 'Синхронизировать базу знаний'}
                </button>
              </div>
              {syncMessage && (
                <div className={`sync-message ${syncMessage.includes('Ошибка') ? 'error' : 'success'}`}>
                  {syncMessage}
                </div>
              )}
            </div>

            <div className="panel-section">
              <h3>Информация о системе</h3>
              <div className="system-info">
                <div className="info-item">
                  <span className="info-label">Версия системы:</span>
                  <span className="info-value">1.0.0</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Статус сервисов:</span>
                  <span className="info-value">🟢 Активен</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Время работы:</span>
                  <span className="info-value">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-panel">
            <div className="panel-section">
              <h3>Управление пользователями</h3>
              <div className="users-stats">
                <div className="stat-card">
                  <div className="stat-value">{users.length}</div>
                  <div className="stat-label">Всего пользователей</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
                  <div className="stat-label">Администраторов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{users.filter(u => u.role === 'user').length}</div>
                  <div className="stat-label">Пользователей</div>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <h3>Список пользователей</h3>
              <div className="users-table">
                <div className="table-header">
                  <div className="table-cell">Имя</div>
                  <div className="table-cell">Email</div>
                  <div className="table-cell">Роль</div>
                  <div className="table-cell">Дата регистрации</div>
                  <div className="table-cell">Действия</div>
                </div>
                {users.map(userData => (
                  <div key={userData.id} className="table-row">
                    <div className="table-cell">{userData.name}</div>
                    <div className="table-cell">{userData.email}</div>
                    <div className="table-cell">
                      <span className={`role-badge ${userData.role}`}>
                        {userData.role === 'admin' ? 'Администратор' : 'Пользователь'}
                      </span>
                    </div>
                    <div className="table-cell">
                      {new Date(userData.createdAt).toLocaleDateString()}
                    </div>
                    <div className="table-cell">
                      <div className="action-buttons">
                        {userData.id !== user?.id && (
                          <>
                            <button
                              onClick={() => handleChangeRole(
                                userData.id,
                                userData.role === 'admin' ? 'user' : 'admin'
                              )}
                              className="role-button"
                              title={userData.role === 'admin' ? 'Снять права админа' : 'Сделать админом'}
                            >
                              {userData.role === 'admin' ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(userData.id)}
                              className="delete-button"
                              title="Удалить пользователя"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'openai' && (
          <div className="openai-panel">
            <div className="panel-section">
              <h3>Статистика использования WindexAI</h3>
              {isLoadingStats ? (
                <div className="loading-stats">
                  <RefreshCw size={20} className="spinning" />
                  Загрузка статистики...
                </div>
              ) : openAIStats ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{formatNumber(openAIStats.totalTokens)}</div>
                    <div className="stat-label">Всего токенов</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{formatCurrency(openAIStats.totalCost)}</div>
                    <div className="stat-label">Общие затраты</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{formatNumber(openAIStats.totalRequests)}</div>
                    <div className="stat-label">Всего запросов</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{formatNumber(openAIStats.avgTokensPerRequest)}</div>
                    <div className="stat-label">Среднее токенов/запрос</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{formatCurrency(openAIStats.avgCostPerRequest)}</div>
                    <div className="stat-label">Средняя стоимость/запрос</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{openAIStats.currentMonth}</div>
                    <div className="stat-label">Текущий месяц</div>
                  </div>
                </div>
              ) : (
                <div className="no-stats">Статистика недоступна</div>
              )}
            </div>

            <div className="panel-section">
              <h3>Детальная статистика по дням</h3>
              {dailyStats.length > 0 ? (
                <div className="daily-stats-table">
                  <div className="table-header">
                    <div className="table-cell">Дата</div>
                    <div className="table-cell">Запросы</div>
                    <div className="table-cell">Токены</div>
                    <div className="table-cell">Затраты</div>
                  </div>
                  {dailyStats.map((day, index) => (
                    <div key={index} className="table-row">
                      <div className="table-cell">{day.date}</div>
                      <div className="table-cell">{formatNumber(day.requests)}</div>
                      <div className="table-cell">{formatNumber(day.tokens)}</div>
                      <div className="table-cell">{formatCurrency(day.cost)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-stats">Детальная статистика недоступна</div>
              )}
            </div>

            <div className="panel-section">
              <h3>Настройки API</h3>
              {apiSettings && (
                <div className="api-settings">
                  <div className="setting-item">
                    <span className="setting-label">Модель WindexAI:</span>
                    <span className="setting-value">{apiSettings.model}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Максимум токенов:</span>
                    <span className="setting-value">{formatNumber(apiSettings.maxTokens)}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Температура:</span>
                    <span className="setting-value">{apiSettings.temperature}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Статус API:</span>
                    <span className="setting-value">
                      {apiSettings.apiStatus === 'active' ? '🟢 Активен' : '🔴 Неактивен'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="panel-section">
              <h3>Управление статистикой</h3>
              <div className="action-buttons">
                <button
                  onClick={loadWindexAIStats}
                  disabled={isLoadingStats}
                  className="refresh-button"
                >
                  <RefreshCw size={20} className={isLoadingStats ? 'spinning' : ''} />
                  {isLoadingStats ? 'Обновление...' : 'Обновить статистику'}
                </button>
                <button
                  onClick={handleResetStats}
                  className="reset-button"
                >
                  <Trash2 size={20} />
                  Сбросить статистику
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 