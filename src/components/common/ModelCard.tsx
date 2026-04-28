import type { ModelKey, ModelPrediction, RiskLevel } from '../../types';
import Badge from './Badge';
import MiniTrendChart from './MiniTrendChart';
import './ModelCard.css';

interface ModelCardProps {
  modelKey: ModelKey;
  prediction: ModelPrediction;
  onSelect: (key: ModelKey) => void;
  isActive?: boolean;
}

function probabilityFromTrend(p: ModelPrediction): number | null {
  if (p.trend.length === 0) return null;
  return p.trend[p.trend.length - 1].pct;
}

function probabilityFromTone(tone: ModelPrediction['tone']): number {
  if (tone === 'danger') return 72;
  if (tone === 'warn') return 45;
  return 18;
}

function toneToRisk(tone: ModelPrediction['tone']): RiskLevel {
  if (tone === 'danger') return 'high';
  if (tone === 'warn') return 'med';
  return 'low';
}

export default function ModelCard({ modelKey, prediction, onSelect, isActive }: ModelCardProps) {
  const prob = probabilityFromTrend(prediction) ?? probabilityFromTone(prediction.tone);
  const risk = toneToRisk(prediction.tone);
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
          <span className="model-card__pct">{prob}</span>
          <span className="model-card__unit">%</span>
        </span>
        <MiniTrendChart trend={prediction.trend} />
      </div>
    </button>
  );
}
