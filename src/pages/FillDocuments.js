import React, { useMemo, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DocumentUpload from '../components/DocumentUpload';
import { Upload, FileText, Camera, User as UserIcon, Calendar, Badge, CreditCard } from 'lucide-react';
import './FillDocuments.css';

const FillDocuments = () => {
  const { user, updateCurrentUser } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [documentType, setDocumentType] = useState(null);
  const [role, setRole] = useState('buyer'); // buyer | seller
  const [contractText, setContractText] = useState('');
  const [filledText, setFilledText] = useState('');
  
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const fileInputRef = useRef(null);

  const profileDefaults = useMemo(() => {
    // Берём данные из профиля пользователя. Поля могут отсутствовать — обрабатываем мягко
    return {
      fullName: user?.fullName || user?.name || '',
      lastName: user?.lastName || '',
      firstName: user?.firstName || '',
      middleName: user?.middleName || '',
      snils: user?.snils || '',
      passportSeries: user?.passportSeries || '',
      passportNumber: user?.passportNumber || '',
      birthDate: user?.birthDate || '',
      address: user?.address || ''
    };
  }, [user]);

  const docTypes = [
    { id: 'passport', name: 'Паспорт РФ', icon: '🛂' },
    { id: 'snils', name: 'СНИЛС', icon: '📋' }
  ];

  const extractCityFromAddress = (address = '') => {
    try {
      const m = address.match(/г\.?\s*([\p{L} -]+)/u) || address.match(/город\s+([\p{L} -]+)/u);
      return (m && m[1] ? m[1].trim().replace(/[,]+$/, '') : '').trim();
    } catch (_) { return ''; }
  };

  const buildFullName = () => {
    if (profileDefaults.fullName && profileDefaults.fullName.trim().length > 0) return profileDefaults.fullName.trim();
    return [profileDefaults.lastName, profileDefaults.firstName, profileDefaults.middleName].filter(Boolean).join(' ').trim();
  };

  const fillContractFromProfile = (text, overrides = {}) => {
    if (!text || typeof text !== 'string') return '';
    let result = text;
    const fullName = (overrides.fullName || '').trim() || buildFullName();
    const series = (overrides.passportSeries || '').trim() || (profileDefaults.passportSeries || '').trim();
    const number = (overrides.passportNumber || '').trim() || (profileDefaults.passportNumber || '').trim();
    const address = (overrides.address || '').trim() || (profileDefaults.address || '').trim();
    const city = extractCityFromAddress(address);

    // № ______ → номер по дате/времени
    const autoNo = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(2, 10);
    result = result.replace(/No\s*_{2,}/g, `No ${autoNo}`);

    // г.«»YYYY г. → г.«Город» YYYY г.
    result = result.replace(/г\.?\s*«»\s*(\d{4})\s*г\./g, (_, y) => `г.«${city || ''}» ${y} г.`);

    if (role === 'buyer') {
      // Покупатель: гражданин ____ → Покупатель: гражданин ФИО
      result = result.replace(/Покупатель:\s*гражданин\s*,?/i, () => `Покупатель: гражданин ${fullName}`);
      // паспорт: серия No → паспорт: серия {series} No {number}
      result = result.replace(/паспорт:\s*серия\s*No\s*,?/i, () => `паспорт: серия ${series} No ${number}`);
      // зарегистрированный по адресу: → зарегистрированный по адресу: {address}
      result = result.replace(/адресу:\s*(?=\n|$)/i, () => `адресу: ${address}`);
    } else {
      // Продавец: → Продавец: ФИО,
      result = result.replace(/Продавец:\s*,?/i, () => `Продавец: ${fullName},`);
    }

    return result;
  };

  const handleAutoFill = () => {
    setFilledText(fillContractFromProfile(contractText));
  };

  const handleDownloadDocx = async () => {
    try {
      const res = await fetch('http://localhost:3006/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'Договор',
          content: filledText || contractText,
          userData: {
            fullName: buildFullName(),
            passportSeries: profileDefaults.passportSeries,
            passportNumber: profileDefaults.passportNumber,
            address: profileDefaults.address,
            role
          }
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Договор_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Ошибка скачивания: ${e.message}`);
    }
  };

  const applyExtractedToProfile = (fields) => {
    try {
      const updates = {};
      if (fields.lastName && !user?.lastName) updates.lastName = fields.lastName;
      if (fields.firstName && !user?.firstName) updates.firstName = fields.firstName;
      if (fields.middleName && !user?.middleName) updates.middleName = fields.middleName;
      const inferredFullName = [fields.lastName, fields.firstName, fields.middleName].filter(Boolean).join(' ').trim();
      if (inferredFullName && !user?.fullName) updates.fullName = inferredFullName;
      if (fields.series && !user?.passportSeries) updates.passportSeries = fields.series;
      if (fields.number && !user?.passportNumber) updates.passportNumber = fields.number;
      if (fields.address && !user?.address) updates.address = fields.address;
      if (Object.keys(updates).length > 0) updateCurrentUser(updates);
    } catch (_) {}
  };

  const handleOcrFile = async (file) => {
    if (!file) return;
    setIsOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);

      const res = await fetch('http://localhost:3006/ocr', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const fields = data?.extractedData || {};
      const overrides = {
        fullName: [fields.lastName, fields.firstName, fields.middleName].filter(Boolean).join(' ').trim(),
        passportSeries: fields.series || '',
        passportNumber: fields.number || '',
        address: fields.address || ''
      };
      const next = fillContractFromProfile(contractText, overrides);
      setFilledText(next);
      applyExtractedToProfile(fields);
    } catch (e) {
      alert(`Ошибка распознавания: ${e.message}`);
    } finally {
      setIsOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fill-docs-page">
      <div className="fill-docs-header">
        <div className="title">
          <FileText size={24} />
          <h2>Заполнение документов</h2>
        </div>
        <p className="subtitle">Загрузите или отсканируйте шаблон. ИИ заполнит прочерки вашими данными из профиля (ФИО, дата рождения, СНИЛС и др.).</p>
      </div>

      {/* Автозаполнение текста договора */}
      <div className="contract-fill-card">
        <div className="contract-fill-header">
          <h3>Автозаполнение текста договора</h3>
          <div className="role-toggle">
            <span>Моя роль:</span>
            <button className={`toggle-btn ${role==='buyer'?'active':''}`} onClick={() => setRole('buyer')}>Покупатель</button>
            <button className={`toggle-btn ${role==='seller'?'active':''}`} onClick={() => setRole('seller')}>Продавец</button>
          </div>
        </div>
        <textarea
          className="contract-textarea"
          placeholder="Вставьте сюда текст договора"
          value={contractText}
          onChange={(e) => setContractText(e.target.value)}
          rows={10}
        />
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" onClick={handleAutoFill}>Заполнить из профиля</button>
          <button className="btn btn-secondary" onClick={handleDownloadDocx} disabled={!contractText && !filledText}>Скачать DOCX</button>
        </div>
        <div className="ocr-upload">
          
          <div className="ocr-buttons">
            <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={isOcrLoading}>
              <Upload size={16} /> Загрузить фото/файл для автозаполнения
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => handleOcrFile(e.target.files?.[0] || null)} />
          </div>
          {isOcrLoading && <div className="ocr-loading">Распознаю…</div>}
        </div>
        {(filledText || contractText) && (
          <div className="preview">
            <div className="preview-title">Предпросмотр</div>
            <pre className="preview-body">{filledText || contractText}</pre>
          </div>
        )}
      </div>

      <div className="profile-hints">
        <div className="hint">
          <UserIcon size={16} /> <span>ФИО: {profileDefaults.fullName || `${profileDefaults.lastName} ${profileDefaults.firstName} ${profileDefaults.middleName}` || '—'}</span>
        </div>
        <div className="hint">
          <Badge size={16} /> <span>СНИЛС: {profileDefaults.snils || '—'}</span>
        </div>
        <div className="hint">
          <CreditCard size={16} /> <span>Паспорт: {`${profileDefaults.passportSeries} ${profileDefaults.passportNumber}`.trim() || '—'}</span>
        </div>
        <div className="hint">
          <Calendar size={16} /> <span>Дата рождения: {profileDefaults.birthDate || '—'}</span>
        </div>
      </div>

      <div className="doc-type-grid">
        {docTypes.map((t) => (
          <button key={t.id} className={`doc-type ${documentType?.id === t.id ? 'active' : ''}`} onClick={() => setDocumentType(t)}>
            <span className="emoji">{t.icon}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={() => setShowUpload(true)} disabled={!documentType}>
          <Upload size={18} /> <span>Загрузить файл</span>
        </button>
        <button className="btn btn-secondary" onClick={() => setShowUpload(true)} disabled={!documentType}>
          <Camera size={18} /> <span>Сканировать камерой</span>
        </button>
      </div>

      {showUpload && (
        <DocumentUpload
          onTextExtracted={() => setShowUpload(false)}
          onClose={() => setShowUpload(false)}
          documentType={documentType}
          storageKey="documents"
          profileDefaults={profileDefaults}
        />
      )}
    </div>
  );
};

export default FillDocuments;

