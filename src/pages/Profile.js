import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Mail, Lock, BarChart3, Wallet, Plus, Minus, ArrowUpRight, ArrowDownLeft, Brain } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import UserProfile from '../components/UserProfile';
import './Profile.css';

const Profile = () => {
  const { user, updateCurrentUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: user?.password || ''
  });
  // Separate state for wallet balance, always fetched from backend
  const [walletBalance, setWalletBalance] = useState(0);
  const [message, setMessage] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showAIProfile, setShowAIProfile] = useState(false);

  // Список транзакций пользователя
  const [transactions, setTransactions] = useState([]);

  // Загрузка реального баланса
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const res = await fetch(buildApiUrl('wallet/balance'));
        const json = await res.json();
        if (json.success) {
          setWalletBalance(json.data.amount);
        }
      } catch (error) {
        console.error('Failed to load wallet balance:', error);
      }
    };
    loadBalance();
  }, []);

  // Загрузка истории транзакций
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const res = await fetch(buildApiUrl('wallet/transactions?limit=10'));
        const json = await res.json();
        if (json.success) {
          setTransactions(json.data.transactions);
        }
      } catch (error) {
        console.error('Failed to load transactions:', error);
      }
    };
    loadTransactions();
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

  const handleAddFunds = async (e) => {
    e.preventDefault();
    const amount = Number(walletAmount);
    if (amount <= 0) {
      setMessage('Введите корректную сумму');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    try {
      const res = await fetch(buildApiUrl('wallet/deposit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const json = await res.json();
      if (json.success) {
        const transaction = json.data;
        const currentBalance = walletBalance;
        const newBalance = currentBalance + transaction.amount;
        setWalletBalance(newBalance);
        setTransactions(prev => [transaction, ...prev]);
        setWalletAmount('');
        setShowAddFunds(false);
        setMessage(`Счет пополнен на ${transaction.amount} ₽`);
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMessage(json.error || 'Ошибка при пополнении счета');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      setMessage('Ошибка при пополнении счета');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleWithdrawFunds = async (amount) => {
    const currentBalance = walletBalance;
    if (amount > currentBalance) {
      setMessage('Недостаточно средств на счете');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    try {
      const res = await fetch(buildApiUrl('wallet/withdraw'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, walletAddress: form.walletAddress })
      });
      const json = await res.json();
      if (json.success) {
        const transaction = json.data;
        const newBalance = currentBalance + transaction.amount;
        setWalletBalance(newBalance);
        setTransactions(prev => [transaction, ...prev]);
        setMessage(`Выведено ${Math.abs(transaction.amount)} ₽`);
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMessage(json.error || 'Ошибка при выводе средств');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      setMessage('Ошибка при выводе средств');
      setTimeout(() => setMessage(''), 2000);
    }
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
          <div className="profile-header-actions">
            <button 
              type="button"
              className="btn btn-ai-profile"
              onClick={() => setShowAIProfile(true)}
              title="Профиль AI с автоматически извлеченными данными"
            >
              <Brain size={18} />
              AI Профиль
            </button>
            {message && <div className="profile-badge">{message}</div>}
          </div>
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
                <span className="balance-value">{Number(walletBalance).toLocaleString('ru-RU')}</span>
                <span className="balance-currency">₽</span>
              </div>
              <div className="balance-label">Текущий баланс</div>
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
                disabled={walletBalance < 100}
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

          {/* Тарификация Windex-Юрист */}
          <div className="pricing-card">
            <div className="metrics-header">
              <div className="metrics-title">
                <Brain size={18} />
                <span>Тарификация Windex-Юрист</span>
              </div>
            </div>

            <div className="pricing-table">
              <div className="pricing-table-header">
                <div className="pricing-service">Услуга</div>
                <div className="pricing-unit">Единица</div>
                <div className="pricing-price">Цена</div>
              </div>
              
              <div className="pricing-row">
                <div className="pricing-service">
                  <div className="service-name">Чат с Windex-Юристом</div>
                  <div className="service-description">Текстовое общение с AI-юристом</div>
                </div>
                <div className="pricing-unit">1 час</div>
                <div className="pricing-price">119 ₽</div>
              </div>
              
              <div className="pricing-row">
                <div className="pricing-service">
                  <div className="service-name">Голосовое общение с Windex-Юристом</div>
                  <div className="service-description">Разговор с AI-юристом голосом</div>
                </div>
                <div className="pricing-unit">1 час</div>
                <div className="pricing-price">199 ₽</div>
              </div>
              
              <div className="pricing-row">
                <div className="pricing-service">
                  <div className="service-name">Генерация документов</div>
                  <div className="service-description">Создание юридических документов</div>
                </div>
                <div className="pricing-unit">1 страница</div>
                <div className="pricing-price">50 ₽</div>
              </div>
              
              <div className="pricing-row">
                <div className="pricing-service">
                  <div className="service-name">Анализ документов</div>
                  <div className="service-description">Анализ и проверка документов</div>
                </div>
                <div className="pricing-unit">1 страница</div>
                <div className="pricing-price">3 ₽</div>
              </div>
            </div>

          </div>

          <div className="profile-actions">
            <button type="button" className="btn btn-outline" onClick={logout}>Выйти</button>
            <button type="submit" className="btn btn-primary">Сохранить</button>
          </div>
        </form>
      </div>
      
      {/* AI Профиль с автоматически извлеченными данными */}
      {showAIProfile && (
        <UserProfile 
          userId={user.id || user.email || 'default_user'} 
          onClose={() => setShowAIProfile(false)} 
        />
      )}
    </div>
  );
};

export default Profile;

