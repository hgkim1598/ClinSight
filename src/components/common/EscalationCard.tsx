import type { EscalationPrediction, RiskLevel } from '../../types';
import Badge from './Badge';
import './EscalationCard.css';

interface EscalationCardProps {
  escalation: EscalationPrediction;
}

function probabilityToRisk(pct: number): RiskLevel {
  if (pct >= 60) return 'high';
  if (pct >= 30) return 'med';
  return 'low';
}

export default function EscalationCard({ escalation }: EscalationCardProps) {
  const risk = probabilityToRisk(escalation.probability);
  const isInUse = escalation.currentStatus === 'inUse';
  const maxAbs = Math.max(
    ...escalation.shap.map((f) => Math.abs(f.value)),
    0.001,
  );

  return (
    <div className="escalation">
      <div className="escalation__head">
        <span className="escalation__tag">보조지표</span>
        <span className="escalation__title">{escalation.title}</span>
      </div>
      <p className="escalation__hint">12시간 내 새로운 치료 시작 가능성</p>

      <div className="escalation__top">
        <div className="escalation__prob">
          <span className="escalation__prob-value">{escalation.probability}</span>
          <span className="escalation__prob-unit">%</span>
        </div>
        <Badge level={risk} />
        <div
          className={`escalation__status ${
            isInUse ? 'escalation__status--inuse' : 'escalation__status--unused'
          }`}
        >
          <span className="escalation__status-dot" aria-hidden="true" />
          {isInUse ? '사용 중' : '미사용'}
        </div>
      </div>

      <div className="escalation__shap">
        <span className="escalation__shap-title">주요 신호 (상위 3개)</span>
        <ul>
          {escalation.shap.map((f) => {
            const widthPct = Math.round((Math.abs(f.value) / maxAbs) * 100);
            return (
              <li key={f.name}>
                <span className="escalation__shap-name">{f.name}</span>
                <div className="escalation__shap-track">
                  <div
                    className={`escalation__shap-fill escalation__shap-fill--${f.direction}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="escalation__shap-value">
                  {f.direction === 'up' ? '+' : '−'}
                  {Math.abs(f.value).toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="escalation__footnote">
        본 예측은 onset 이후 새로운 치료 시작 여부를 대상으로 합니다. 이미 해당 치료를 받는 환자는 해당되지 않습니다.
      </p>
    </div>
  );
}
