import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ShapFeature } from '../../types';
import './ShapChart.css';

interface ShapChartProps {
  features: ShapFeature[];
  topN?: number;
}

export default function ShapChart({ features, topN = 5 }: ShapChartProps) {
  const [expanded, setExpanded] = useState(false);

  if (features.length === 0) {
    return <div className="shap-chart shap-chart--empty">SHAP 데이터가 없습니다.</div>;
  }

  const visible = expanded ? features : features.slice(0, topN);
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.value)), 0.001);
  const hasMore = features.length > topN;

  return (
    <div className="shap-chart">
      <p className="shap-chart__note">
        값은 모델 내부 기여도(상대값)이며 확률 %p와 다를 수 있음
      </p>
      <ul className="shap-chart__list">
        {visible.map((f) => {
          const ratio = Math.abs(f.value) / maxAbs;
          const barPct = Math.round(ratio * 50);
          const isUp = f.direction === 'up';
          return (
            <li key={f.name} className="shap-chart__row">
              <span className="shap-chart__name" title={f.name}>
                {f.name}
              </span>
              <div className="shap-chart__track" aria-hidden="true">
                <div className="shap-chart__axis" />
                {isUp ? (
                  <div
                    className="shap-chart__fill shap-chart__fill--up"
                    style={{ width: `${barPct}%`, left: '50%' }}
                  />
                ) : (
                  <div
                    className="shap-chart__fill shap-chart__fill--down"
                    style={{ width: `${barPct}%`, right: '50%' }}
                  />
                )}
              </div>
              <span className={`shap-chart__value shap-chart__value--${f.direction}`}>
                {isUp ? '+' : '−'}
                {Math.abs(f.value).toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          className="shap-chart__toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} /> 접기
            </>
          ) : (
            <>
              <ChevronDown size={14} /> 더 보기 ({features.length - topN}개)
            </>
          )}
        </button>
      )}
    </div>
  );
}
