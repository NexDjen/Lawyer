import React from 'react';
import { useLocation } from 'react-router-dom';
import './Documents.css';

const DocumentsSimple = () => {
  const location = useLocation();

  console.log('DocumentsSimple component rendered, current location:', location.pathname);

  return (
    <div className="documents-page">
      <div className="container">
        <div className="documents-header">
          <h1>Управление документами</h1>
          <p>Просмотр и управление всеми документами системы</p>
        </div>
        
        <div className="documents-content">
          <div className="documents-empty">
            <h3>Документы не найдены</h3>
            <p>Загрузите документы для начала работы</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsSimple;
