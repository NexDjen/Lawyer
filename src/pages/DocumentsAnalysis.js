import React from 'react';
import { Brain, AlertTriangle, Lightbulb, Shield, FileText } from 'lucide-react';
import DocumentUploadWithAnalysis from '../components/DocumentUploadWithAnalysis';
import './DocumentsAnalysis.css';

const DocumentsAnalysis = () => {
  return (
    <div className="documents-analysis-page">
      <div className="container">
        <div className="documents-analysis-content">
          <div className="analysis-header">
            <div className="analysis-header__icon">
              <Brain size={48} />
            </div>
            <div className="analysis-header__text">
              <h1 className="analysis-title">Анализ документов</h1>
              <p className="analysis-subtitle">
                Глубокий анализ документов с помощью ИИ. Загрузите документ и получите детальный отчет о рисках, ошибках и рекомендациях.
              </p>
            </div>
          </div>

          {/* Компонент загрузки и анализа документов */}
          <DocumentUploadWithAnalysis />

          {/* Информационные блоки */}
          <div className="analysis-info">
            <div className="analysis-info__grid">
              <div className="analysis-info__card">
                <div className="analysis-info__icon">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="analysis-info__title">Риски</h3>
                <p className="analysis-info__description">
                  Выявление потенциальных правовых, финансовых и операционных рисков в документах
                </p>
              </div>

              <div className="analysis-info__card">
                <div className="analysis-info__icon">
                  <Lightbulb size={24} />
                </div>
                <h3 className="analysis-info__title">Рекомендации</h3>
                <p className="analysis-info__description">
                  Конкретные предложения по улучшению документов и снижению рисков
                </p>
              </div>

              <div className="analysis-info__card">
                <div className="analysis-info__icon">
                  <Shield size={24} />
                </div>
                <h3 className="analysis-info__title">Соответствие</h3>
                <p className="analysis-info__description">
                  Проверка соответствия документов действующему законодательству
                </p>
              </div>

              <div className="analysis-info__card">
                <div className="analysis-info__icon">
                  <FileText size={24} />
                </div>
                <h3 className="analysis-info__title">Детальный отчет</h3>
                <p className="analysis-info__description">
                  Полный анализ с выявленными проблемами и путями их решения
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsAnalysis;
