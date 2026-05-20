import type { ModelKey, ModelPrediction } from '../../types';
import { MODEL_KEY_DISPLAY_NAME } from '../../utils/modelDisplayNames';
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

/** target_name → 카드 제목 폴백 (prediction 없을 때). 5개 메인 카드의 기본 model_key 매핑. */
const FALLBACK_TITLE: Record<ModelKey, string> = {
  mortality: MODEL_KEY_DISPLAY_NAME.mortality_48h,
  aki: MODEL_KEY_DISPLAY_NAME.aki_24h,
  ards: MODEL_KEY_DISPLAY_NAME.ards_72h,
  sic: MODEL_KEY_DISPLAY_NAME.sic_48h,
  shock: MODEL_KEY_DISPLAY_NAME.septic_shock_48h,
};

export default function ModelCard({ modelKey, prediction, onSelect, isActive }: ModelCardProps) {
  // prediction 없음 → placeholder 카드 (회색 톤, N/A 뱃지, "—")
  if (!prediction) {
    return (
      <button
        type="button"
        className={`model-card model-card--unknown ${isActive ? 'is-active' : ''}`}
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
  // 예측 실패(riskLabel=null)면 tone과 무관하게 회색 표시.
  const displayTone = risk ? prediction.tone : 'unknown';

  return (
    <button
      type="button"
      className={`model-card model-card--${displayTone} ${isHigh ? 'is-high' : ''} ${
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
