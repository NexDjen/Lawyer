import React, { useState, useEffect, useCallback } from 'react';
import { User, Edit3, Save, X, Info, Shield, Clock, TrendingUp } from 'lucide-react';
import './UserProfile.css';

const UserProfile = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/profile/${userId}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки профиля');
      }
      
      const profileData = await response.json();
      setProfile(profileData);
      setEditedData(profileData.personalData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, loadProfile]);

  const handleEdit = () => {
    setEditing(true);
    setEditedData(profile.personalData);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditedData(profile.personalData);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalData: editedData
        })
      });
      
      if (!response.ok) {
        throw new Error('Ошибка сохранения профиля');
      }
      
      await loadProfile();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getCompletionColor = (completeness) => {
    if (completeness >= 80) return '#10b981';
    if (completeness >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="profile-modal">
        <div className="profile-content">
          <div className="profile-loading">
            <div className="spinner"></div>
            <p>Загрузка профиля...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-modal">
        <div className="profile-content">
          <div className="profile-error">
            <h3>Ошибка</h3>
            <p>{error}</p>
            <button onClick={onClose} className="btn-secondary">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal">
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-title">
            <User className="profile-icon" />
            <h2>Профиль пользователя</h2>
          </div>
          <div className="profile-actions">
            {!editing ? (
              <button onClick={handleEdit} className="btn-primary">
                <Edit3 size={16} />
                Редактировать
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  onClick={handleSave} 
                  className="btn-success"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button onClick={handleCancel} className="btn-secondary">
                  <X size={16} />
                  Отмена
                </button>
              </div>
            )}
            <button onClick={onClose} className="btn-close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Статистика профиля */}
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-header">
              <TrendingUp className="stat-icon" />
              <span>Заполненность</span>
            </div>
            <div className="stat-value">
              <div 
                className="completeness-bar"
                style={{ 
                  '--completion': `${profile.statistics.completeness}%`,
                  '--color': getCompletionColor(profile.statistics.completeness)
                }}
              >
                <div className="completion-fill"></div>
              </div>
              <span>{profile.statistics.completeness}%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <Info className="stat-icon" />
              <span>Заметки о деле</span>
            </div>
            <div className="stat-value">
              <span className="stat-number">{profile.statistics.totalCaseNotes}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <Clock className="stat-icon" />
              <span>Последняя активность</span>
            </div>
            <div className="stat-value">
              <span className="stat-date">{formatDate(profile.statistics.lastUpdate)}</span>
            </div>
          </div>
        </div>

        {/* Основная информация */}
        <div className="profile-section">
          <h3>Основная информация</h3>
          <div className="profile-fields">
            <ProfileField
              label="ФИО"
              field="fullName"
              value={editing ? editedData.fullName : profile.personalData.fullName}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Введите полное ФИО"
            />
            
            <ProfileField
              label="Имя"
              field="firstName"
              value={editing ? editedData.firstName : profile.personalData.firstName}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Введите имя"
            />
            
            <ProfileField
              label="Фамилия"
              field="lastName"
              value={editing ? editedData.lastName : profile.personalData.lastName}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Введите фамилию"
            />
            
            <ProfileField
              label="Отчество"
              field="middleName"
              value={editing ? editedData.middleName : profile.personalData.middleName}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Введите отчество"
            />
            
            <ProfileField
              label="Дата рождения"
              field="birthDate"
              value={editing ? editedData.birthDate : profile.personalData.birthDate}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="ДД.ММ.ГГГГ"
              type="date-text"
            />
            
            <ProfileField
              label="Место рождения"
              field="birthPlace"
              value={editing ? editedData.birthPlace : profile.personalData.birthPlace}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Введите место рождения"
            />
          </div>
        </div>

        {/* Контактная информация */}
        <div className="profile-section">
          <h3>Контактная информация</h3>
          <div className="profile-fields">
            <ProfileField
              label="Телефон"
              field="phone"
              value={editing ? editedData.phone : profile.personalData.phone}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="+7 (999) 123-45-67"
              type="tel"
            />
            
            <ProfileField
              label="Email"
              field="email"
              value={editing ? editedData.email : profile.personalData.email}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="example@email.com"
              type="email"
            />
            
            <ProfileField
              label="Адрес"
              field="address"
              value={editing ? editedData.address : profile.personalData.address}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Полный адрес проживания"
              multiline
            />
          </div>
        </div>

        {/* Документы */}
        <div className="profile-section">
          <h3>
            <Shield className="section-icon" />
            Документы
          </h3>
          <div className="profile-fields">
            <ProfileField
              label="Серия паспорта"
              field="passportSeries"
              value={editing ? editedData.passportSeries : profile.personalData.passportSeries}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="1234"
              maxLength={4}
              sensitive
            />
            
            <ProfileField
              label="Номер паспорта"
              field="passportNumber"
              value={editing ? editedData.passportNumber : profile.personalData.passportNumber}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="123456"
              maxLength={6}
              sensitive
            />
            
            <ProfileField
              label="ИНН"
              field="inn"
              value={editing ? editedData.inn : profile.personalData.inn}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="123456789012"
              maxLength={12}
              sensitive
            />
            
            <ProfileField
              label="СНИЛС"
              field="snils"
              value={editing ? editedData.snils : profile.personalData.snils}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="123-456-789-12"
              sensitive
            />
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="profile-section">
          <h3>Дополнительная информация</h3>
          <div className="profile-fields">
            <ProfileField
              label="Семейное положение"
              field="maritalStatus"
              value={editing ? editedData.maritalStatus : profile.personalData.maritalStatus}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Семейное положение"
              type="select"
              options={[
                { value: '', label: 'Не указано' },
                { value: 'холост', label: 'Холост/Не замужем' },
                { value: 'женат', label: 'Женат/Замужем' },
                { value: 'разведен', label: 'Разведен/Разведена' },
                { value: 'вдовец', label: 'Вдовец/Вдова' }
              ]}
            />
            
            <ProfileField
              label="Профессия"
              field="occupation"
              value={editing ? editedData.occupation : profile.personalData.occupation}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Введите профессию"
            />
            
            <ProfileField
              label="Место работы"
              field="workplace"
              value={editing ? editedData.workplace : profile.personalData.workplace}
              editing={editing}
              onChange={handleFieldChange}
              placeholder="Введите место работы"
            />
          </div>
        </div>

        {/* Заметки о деле */}
        {profile.caseNotes.length > 0 && (
          <div className="profile-section">
            <h3>Заметки о деле</h3>
            <div className="case-notes">
              {profile.caseNotes.map((note, index) => (
                <div key={note.id || index} className="case-note">
                  <div className="note-header">
                    <span className="note-date">{formatDate(note.timestamp)}</span>
                    <span className={`note-importance importance-${note.importance}`}>
                      Важность: {note.importance}/10
                    </span>
                  </div>
                  <div className="note-content">{note.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент для отдельного поля профиля
const ProfileField = ({ 
  label, 
  field, 
  value, 
  editing, 
  onChange, 
  placeholder = '', 
  type = 'text',
  multiline = false,
  sensitive = false,
  maxLength,
  options = []
}) => {
  const displayValue = sensitive && !editing && value ? 
    value.replace(/./g, '*') : value;

  if (!editing) {
    return (
      <div className="profile-field">
        <label>{label}</label>
        <div className="field-value">
          {displayValue || <span className="empty-value">Не указано</span>}
        </div>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="profile-field">
        <label>{label}</label>
        <select
          value={value || ''}
          onChange={(e) => onChange(field, e.target.value)}
          className="field-input"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className="profile-field">
        <label>{label}</label>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder={placeholder}
          className="field-input"
          rows={3}
          maxLength={maxLength}
        />
      </div>
    );
  }

  return (
    <div className="profile-field">
      <label>{label}</label>
      <input
        type={type === 'date-text' ? 'text' : type}
        value={value || ''}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        className="field-input"
        maxLength={maxLength}
      />
    </div>
  );
};

export default UserProfile;
