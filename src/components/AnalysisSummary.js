import React from 'react';
import './AnalysisSummary.css';

const AnalysisSummary = ({ totalProblems, criticalCount, mediumCount, lowCount, recommendationsCount, riskLevel }) => (
  <div className="analysis-summary-container">
    <h2 className="summary-title">Резюме анализа</h2>
    <div className="summary-grid">
      <div className="summary-item">
        <span className="item-label">Всего проблем</span>
        <span className="item-value">{totalProblems}</span>
      </div>
      <div className="summary-item">
        <span className="item-label">Критических</span>
        <span className="item-value">{criticalCount}</span>
      </div>
      <div className="summary-item">
        <span className="item-label">Средних</span>
        <span className="item-value">{mediumCount}</span>
      </div>
      <div className="summary-item">
        <span className="item-label">Низких</span>
        <span className="item-value">{lowCount}</span>
      </div>
      <div className="summary-item">
        <span className="item-label">Рекомендаций</span>
        <span className="item-value">{recommendationsCount}</span>
      </div>
      <div className="summary-item summary-risk">
        <span className="item-label">Уровень риска</span>
        <span className="item-value risk-level">{riskLevel}</span>
      </div>
    </div>
  </div>
);

export default AnalysisSummary;


