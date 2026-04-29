import type { ShapFeature } from '../../types';
import './ShapChart.css';

interface ShapChartProps {
  features: ShapFeature[];
  topN?: number;
}

const SHAP_COLORS = [
  'var(--shap-1)',
  'var(--shap-2)',
  'var(--shap-3)',
  'var(--shap-4)',
  'var(--shap-5)',
];

function dirSymbol(d: ShapFeature['direction']): string {
  return d === 'up' ? '↑' : '↓';
}

function tooltipText(f: ShapFeature): string {
  return `${dirSymbol(f.direction)} ${f.name} · ${f.value.toFixed(2)}`;
}

export default function ShapChart({ features, topN = 5 }: ShapChartProps) {
  if (features.length === 0) {
    return (
      <div className="shap-chart shap-chart--empty">SHAP 데이터가 없습니다.</div>
    );
  }

  const top = [...features]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, topN);
  const total = top.reduce((s, f) => s + Math.abs(f.value), 0) || 1;

  return (
    <div className="shap-chart">
      <p className="shap-chart__note">
        값은 모델 내부 기여도(상대값)이며 확률 %p와 다를 수 있음
      </p>
      <div className="shap-chart__blocks" role="list">
        {top.map((f, i) => {
          const ratio = Math.abs(f.value) / total;
          return (
            <div
              key={f.name}
              role="listitem"
              className="shap-chart__block"
              style={{
                flexBasis: `${ratio * 100}%`,
                backgroundColor: SHAP_COLORS[i % SHAP_COLORS.length],
              }}
              title={tooltipText(f)}
            >
              <span className="shap-chart__block-name">{f.name}</span>
              <span className="shap-chart__block-value">{f.value.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
