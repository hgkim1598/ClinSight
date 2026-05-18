import type { ModelKey, ModelPrediction } from '../../types';
import Badge from './Badge';
import MiniTrendChart from './MiniTrendChart';
import './ModelCard.css';

interface ModelCardProps {
  modelKey: ModelKey;
  /** null 이면 예측 데이터 없음 placeholder 카드 표시 */
  prediction: ModelPrediction | null;
  onSelect: (key: ModelKey) => void;
  isActive?: boolean;
}

function probabilityFromTrend(p: ModelPrediction): number | null {
  if (p.trend.length === 0) return null;
  return p.trend[p.trend.length - 1].pct;
}

/** target_name 기반 카드 제목 폴백. (prediction 없을 때) */
const FALLBACK_TITLE: Record<ModelKey, string> = {
  mortality: '사망 위험',
  aki: '급성 신손상 (AKI)',
  ards: '급성호흡곤란증후군 (ARDS)',
  sic: '패혈증 유발 응고장애 (SIC)',
  shock: '패혈성 쇼크 (Septic Shock)',
};

export default function ModelCard({ modelKey, prediction, onSelect, isActive }: ModelCardProps) {
  // prediction 없음 → placeholder 카드 (safe 톤, N/A 뱃지, "—")
  if (!prediction) {
    return (
      <button
        type="button"
        className={`model-card model-card--safe ${isActive ? 'is-active' : ''}`}
        onClick={() => onSelect(modelKey)}
      >
        <div className="model-card__head">
          <span className="model-card__title">{FALLBACK_TITLE[modelKey]}</span>
          <Badge level={null} />
        </div>
        <div className="model-card__value">
          <span className="model-card__value-text">
            <span className="model-card__pct">—</span>
          </span>
        </div>
      </button>
    );
  }

  // riskScorePct(서비스 매핑) 우선, 없으면 trend 마지막 값, 둘 다 없으면 null → "—"
  const prob = prediction.riskScorePct ?? probabilityFromTrend(prediction);
  const risk = prediction.riskLabel ?? null;
  const isHigh = risk === 'high';

  return (
    <button
      type="button"
      className={`model-card model-card--${prediction.tone} ${isHigh ? 'is-high' : ''} ${
        isActive ? 'is-active' : ''
      }`}
      onClick={() => onSelect(modelKey)}
    >
      <div className="model-card__head">
        <span className="model-card__title">{prediction.title}</span>
        <Badge level={risk} />
      </div>
      <div className="model-card__value">
        <span className="model-card__value-text">
          <span className="model-card__pct">{prob != null ? prob : '—'}</span>
          {prob != null && <span className="model-card__unit">%</span>}
        </span>
        <MiniTrendChart trend={prediction.trend} />
      </div>
    </button>
  );
}
