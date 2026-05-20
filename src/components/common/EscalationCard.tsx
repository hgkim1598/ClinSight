import type { EscalationPrediction, RiskLevel } from '../../types';
import Badge from './Badge';
import './EscalationCard.css';

interface EscalationCardProps {
  escalation: EscalationPrediction;
}

function probabilityToRisk(pct: number | null): RiskLevel | null {
  if (pct == null) return null;
  if (pct >= 60) return 'high';
  if (pct >= 30) return 'medium';
  return 'low';
}

export default function EscalationCard({ escalation }: EscalationCardProps) {
  const risk = probabilityToRisk(escalation.probability);
  const isHighNeed = escalation.need === 'highNeed';
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
          {escalation.probability != null ? (
            <>
              <span className="escalation__prob-value">{escalation.probability}</span>
              <span className="escalation__prob-unit">%</span>
            </>
          ) : (
            <span className="escalation__prob-value">—</span>
          )}
        </div>
        <Badge level={risk} />
        <div
          className={`escalation__status ${
            isHighNeed
              ? 'escalation__status--high-need'
              : 'escalation__status--low-need'
          }`}
          title="모델 예측 기반 필요 가능성 — 현재 사용 상태가 아님"
        >
          <span className="escalation__status-dot" aria-hidden="true" />
          {isHighNeed ? '필요 가능성 높음' : '필요 가능성 낮음'}
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
