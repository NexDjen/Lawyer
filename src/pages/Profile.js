import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Mail, Lock, BarChart3, Wallet, Plus, Minus, ArrowUpRight, ArrowDownLeft, Mic } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, updateCurrentUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: user?.password || '',
    walletAddress: user?.walletAddress || '',
    walletBalance: user?.walletBalance ?? 0,
    // Дополнительные данные для автозаполнения документов
    lastName: user?.lastName || '',
    firstName: user?.firstName || '',
    middleName: user?.middleName || '',
    fullName: user?.fullName || '',
    snils: user?.snils || '',
    passportSeries: user?.passportSeries || '',
    passportNumber: user?.passportNumber || '',
    birthDate: user?.birthDate || '',
    address: user?.address || ''
  });
  const [message, setMessage] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [pricingInfo, setPricingInfo] = useState(null);

  // Моковые транзакции для демонстрации
  const [transactions] = useState([
    {
      id: 1,
      type: 'deposit',
      amount: 500,
      description: 'Пополнение счета',
      date: '2025-09-01',
      status: 'completed'
    },
    {
      id: 2,
      type: 'withdrawal',
      amount: -200,
      description: 'Вывод средств',
      date: '2025-08-28',
      status: 'completed'
    },
    {
      id: 3,
      type: 'service',
      amount: -50,
      description: 'Оплата услуги анализа документов',
      date: '2025-08-25',
      status: 'completed'
    }
  ]);

  // Загрузка информации о тарифах голосового ИИ
  useEffect(() => {
    const loadPricingInfo = async () => {
      try {
        const response = await fetch('http://localhost:3006/wallet/voice-pricing');
        const data = await response.json();
        if (data.success) {
          setPricingInfo(data.data);
        }
      } catch (error) {
        console.error('Failed to load pricing info:', error);
      }
    };

    loadPricingInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updates = {
      name: form.name,
      email: form.email,
      password: form.password,
      walletAddress: form.walletAddress,
      walletBalance: Number(form.walletBalance) || 0,
      lastName: form.lastName,
      firstName: form.firstName,
      middleName: form.middleName,
      fullName: form.fullName,
      snils: form.snils,
      passportSeries: form.passportSeries,
      passportNumber: form.passportNumber,
      birthDate: form.birthDate,
      address: form.address
    };
    updateCurrentUser(updates);
    setMessage('Профиль сохранён');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleAddFunds = (e) => {
    e.preventDefault();
    const amount = Number(walletAmount);
    if (amount <= 0) {
      setMessage('Введите корректную сумму');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const currentBalance = Number(form.walletBalance) || 0;
    const newBalance = currentBalance + amount;

    updateCurrentUser({ walletBalance: newBalance });
    setForm(prev => ({ ...prev, walletBalance: newBalance }));
    setWalletAmount('');
    setShowAddFunds(false);
    setMessage(`Счет пополнен на ${amount} ₽`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleWithdrawFunds = (amount) => {
    const currentBalance = Number(form.walletBalance) || 0;
    if (amount > currentBalance) {
      setMessage('Недостаточно средств на счете');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const newBalance = currentBalance - amount;
    updateCurrentUser({ walletBalance: newBalance });
    setForm(prev => ({ ...prev, walletBalance: newBalance }));
    setMessage(`Выведено ${amount} ₽ со счета`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Метрики пользователя на основе локальных данных
  const sessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
  const totalChats = sessions.length;
  const totalMessages = sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0);
  const lastActivity = sessions[0]?.updatedAt ? new Date(sessions[0].updatedAt) : null;
  const lastActivityText = lastActivity ? lastActivity.toLocaleString('ru-RU') : '—';

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-title">
            <UserIcon size={28} />
            <div>
              <h2>Профиль</h2>
              <p className="profile-subtitle">Личные данные и настройки кошелька</p>
            </div>
          </div>
          {message && <div className="profile-badge">{message}</div>}
        </div>

        <form onSubmit={handleSave} className="profile-grid">
          <div className="profile-field">
            <label><UserIcon size={16} /> Имя</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ваше имя"
            />
          </div>

          <div className="profile-field">
            <label><Mail size={16} /> Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
          </div>

          <div className="profile-field">
            <label><Lock size={16} /> Пароль</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          {/* Блок данных для автозаполнения документов */}
          <div className="profile-field">
            <label>Фамилия</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Иванов"
            />
          </div>
          <div className="profile-field">
            <label>Имя</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Иван"
            />
          </div>
          <div className="profile-field">
            <label>Отчество</label>
            <input
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              placeholder="Иванович"
            />
          </div>
          <div className="profile-field">
            <label>ФИО (полностью)</label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Иванов Иван Иванович"
            />
          </div>
          <div className="profile-field">
            <label>СНИЛС</label>
            <input
              name="snils"
              value={form.snils}
              onChange={handleChange}
              placeholder="000-000-000 00"
            />
          </div>
          <div className="profile-field">
            <label>Серия паспорта</label>
            <input
              name="passportSeries"
              value={form.passportSeries}
              onChange={handleChange}
              placeholder="0000"
            />
          </div>
          <div className="profile-field">
            <label>Номер паспорта</label>
            <input
              name="passportNumber"
              value={form.passportNumber}
              onChange={handleChange}
              placeholder="000000"
            />
          </div>
          <div className="profile-field">
            <label>Дата рождения</label>
            <input
              name="birthDate"
              value={form.birthDate}
              onChange={handleChange}
              placeholder="01.01.1990"
            />
          </div>
          <div className="profile-field">
            <label>Адрес</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="г. Москва, ул. Пример, д. 1"
            />
          </div>

          <div className="metrics-card">
            <div className="metrics-header">
              <div className="metrics-title">
                <BarChart3 size={18} />
                <span>Метрики</span>
              </div>
            </div>
            <div className="metrics-grid">
              <div className="metric">
                <div className="metric-label">Чатов</div>
                <div className="metric-value">{totalChats}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Сообщений</div>
                <div className="metric-value">{totalMessages}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Последняя активность</div>
                <div className="metric-value">{lastActivityText}</div>
              </div>
            </div>
          </div>

          {/* Кошелек */}
          <div className="wallet-card">
            <div className="metrics-header">
              <div className="metrics-title">
                <Wallet size={18} />
                <span>Кошелек</span>
              </div>
            </div>

            <div className="wallet-balance">
              <div className="balance-amount">
                <span className="balance-value">{Number(form.walletBalance || 0).toLocaleString('ru-RU')}</span>
                <span className="balance-currency">₽</span>
              </div>
              <div className="balance-label">Текущий баланс</div>
            </div>

            <div className="wallet-address">
              <label><Wallet size={16} /> Адрес кошелька</label>
              <input
                name="walletAddress"
                value={form.walletAddress}
                onChange={handleChange}
                placeholder="Введите адрес кошелька"
              />
            </div>

            <div className="wallet-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddFunds(!showAddFunds)}
              >
                <Plus size={16} />
                Пополнить
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleWithdrawFunds(100)}
                disabled={Number(form.walletBalance || 0) < 100}
              >
                <Minus size={16} />
                Вывести 100₽
              </button>
            </div>

            {showAddFunds && (
              <form onSubmit={handleAddFunds} className="add-funds-form">
                <div className="form-group">
                  <label>Сумма пополнения:</label>
                  <input
                    type="number"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Введите сумму"
                    min="1"
                    required
                  />
                </div>
                <div className="add-funds-actions">
                  <button type="submit" className="btn btn-primary">Пополнить</button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowAddFunds(false)}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {/* История транзакций */}
            <div className="transactions-section">
              <h4>Последние транзакции</h4>
              <div className="transactions-list">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className={`transaction-item ${transaction.type}`}>
                    <div className="transaction-icon">
                      {transaction.type === 'deposit' ? (
                        <ArrowDownLeft size={16} />
                      ) : transaction.type === 'withdrawal' ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <Minus size={16} />
                      )}
                    </div>
                    <div className="transaction-info">
                      <div className="transaction-description">{transaction.description}</div>
                      <div className="transaction-date">{new Date(transaction.date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className={`transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{transaction.amount} ₽
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* История расходов на голосовой ИИ */}
          <div className="voice-usage-card">
            <div className="metrics-header">
              <div className="metrics-title">
                <Mic size={18} />
                <span>Голосовой ИИ</span>
              </div>
            </div>

            <div className="voice-usage-stats">
              <div className="usage-stat">
                <div className="stat-label">Использовано сегодня</div>
                <div className="stat-value">{pricingInfo?.currentUsage.minutes.toFixed(1) || 0} мин</div>
              </div>
              <div className="usage-stat">
                <div className="stat-label">Потрачено</div>
                <div className="stat-value">{pricingInfo?.currentUsage.cost.toFixed(2) || 0} ₽</div>
              </div>
              <div className="usage-stat">
                <div className="stat-label">Бесплатно осталось</div>
                <div className="stat-value">{pricingInfo?.currentUsage.remainingFreeMinutes.toFixed(1) || 0} мин</div>
              </div>
            </div>

            <div className="voice-pricing-summary">
              <div className="pricing-tier">
                <div className="tier-name">Базовый тариф</div>
                <div className="tier-price">{pricingInfo?.hourlyRate || 199}₽/час</div>
                <div className="tier-description">Первые 5 минут в день бесплатно</div>
              </div>
              <div className="pricing-tier pricing-tier--discounted">
                <div className="tier-name">Без скидки</div>
                <div className="tier-price">{pricingInfo?.discountedRate || 299}₽/час</div>
                <div className="tier-description">Полная стоимость без лимитов</div>
              </div>
            </div>

            <div className="voice-sessions-history">
              <h4>Недавние сессии</h4>
              <div className="sessions-list">
                {transactions
                  .filter(t => t.type === 'service' && t.description.includes('голос'))
                  .slice(0, 3)
                  .map((session) => (
                    <div key={session.id} className="session-item">
                      <div className="session-icon">
                        <Mic size={16} />
                      </div>
                      <div className="session-info">
                        <div className="session-description">{session.description}</div>
                        <div className="session-date">{new Date(session.date).toLocaleDateString('ru-RU')}</div>
                      </div>
                      <div className="session-cost">
                        -{Math.abs(session.amount)}₽
                      </div>
                    </div>
                  ))}
                {transactions.filter(t => t.type === 'service' && t.description.includes('голос')).length === 0 && (
                  <div className="no-sessions">
                    <Mic size={24} />
                    <p>Пока нет сессий голосового ИИ</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="btn btn-outline" onClick={logout}>Выйти</button>
            <button type="submit" className="btn btn-primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;

