import React, { useState, useContext } from 'react';
import { Upload, CheckCircle, AlertCircle, X, Database, HardDrive } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';
import './MigrateDocuments.css';

const MigrateDocuments = ({ onComplete, onCancel }) => {
  const { user } = useContext(AuthContext);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [localStorageDocuments, setLocalStorageDocuments] = useState([]);

  // Check for localStorage documents on component mount
  React.useEffect(() => {
    const savedDocuments = localStorage.getItem('documents');
    if (savedDocuments) {
      try {
        const parsed = JSON.parse(savedDocuments);
        const validDocuments = parsed.filter(doc => 
          doc && doc.name && doc.content && 
          ['analyzed', 'uploaded', 'processing', 'pending'].includes(doc.status)
        );
        setLocalStorageDocuments(validDocuments);
      } catch (error) {
        console.error('Error parsing localStorage documents:', error);
      }
    }
  }, []);

  const handleMigrate = async () => {
    if (localStorageDocuments.length === 0) {
      alert('Нет документов для миграции');
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const userId = user?.id || 'current-user';
      
      const response = await fetch(buildApiUrl('documents/migrate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          documents: localStorageDocuments
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMigrationResult({
          success: true,
          data: result.data
        });
        
        // Clear localStorage after successful migration
        localStorage.removeItem('documents');
        
        // Show success message
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 2000);
      } else {
        throw new Error(result.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    if (onCancel) onCancel();
  };

  if (localStorageDocuments.length === 0) {
    return (
      <div className="migrate-documents-container">
        <div className="migrate-header">
          <Database size={24} />
          <h3>Миграция документов</h3>
        </div>
        <div className="migrate-content">
          <p>В localStorage не найдено документов для миграции.</p>
          <button className="migrate-btn secondary" onClick={handleSkip}>
            Продолжить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="migrate-documents-container">
      <div className="migrate-header">
        <Database size={24} />
        <h3>Миграция документов в базу данных</h3>
      </div>
      
      <div className="migrate-content">
        <div className="migration-info">
          <div className="info-item">
            <HardDrive size={20} />
            <span>Найдено документов в localStorage: <strong>{localStorageDocuments.length}</strong></span>
          </div>
          <div className="info-item">
            <Database size={20} />
            <span>Будут перенесены в SQLite базу данных</span>
          </div>
        </div>

        {migrationResult && (
          <div className={`migration-result ${migrationResult.success ? 'success' : 'error'}`}>
            {migrationResult.success ? (
              <>
                <CheckCircle size={20} />
                <div>
                  <h4>Миграция завершена успешно!</h4>
                  <p>
                    Перенесено: {migrationResult.data.migrated} из {migrationResult.data.total} документов
                  </p>
                  {migrationResult.data.errors > 0 && (
                    <p className="warning">
                      Ошибок: {migrationResult.data.errors}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={20} />
                <div>
                  <h4>Ошибка миграции</h4>
                  <p>{migrationResult.error}</p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="migration-actions">
          {!migrationResult && (
            <>
              <button 
                className="migrate-btn primary" 
                onClick={handleMigrate}
                disabled={isMigrating}
              >
                {isMigrating ? (
                  <>
                    <div className="spinner" />
                    Миграция...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Начать миграцию
                  </>
                )}
              </button>
              <button className="migrate-btn secondary" onClick={handleSkip}>
                Пропустить
              </button>
            </>
          )}
          
          {migrationResult?.success && (
            <button className="migrate-btn primary" onClick={handleSkip}>
              <CheckCircle size={20} />
              Продолжить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrateDocuments;

