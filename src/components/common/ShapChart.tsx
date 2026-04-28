import { useState } from 'react';
import { Circle, LayoutList } from 'lucide-react';
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

/**
 * 버블 좌표 — 가장 큰 원이 중앙, 나머지는 주변에 비대칭 배치.
 * 5개 고정. (rank 1 = 가장 중요한 피처가 중앙)
 */
const BUBBLE_POS: Array<{ cx: string; cy: string }> = [
  { cx: '50%', cy: '48%' },
  { cx: '32%', cy: '38%' },
  { cx: '68%', cy: '38%' },
  { cx: '35%', cy: '65%' },
  { cx: '65%', cy: '65%' },
];

const MIN_BUBBLE_R = 25;
const MAX_BUBBLE_R = 70;

function dirSymbol(d: ShapFeature['direction']): string {
  return d === 'up' ? '↑' : '↓';
}

function tooltipText(f: ShapFeature): string {
  return `${dirSymbol(f.direction)} ${f.name} · ${f.value.toFixed(2)}`;
}

interface ViewProps {
  features: ShapFeature[];
}

function BlockView({ features }: ViewProps) {
  const total = features.reduce((s, f) => s + Math.abs(f.value), 0) || 1;

  return (
    <div className="shap-chart__blocks" role="list">
      {features.map((f, i) => {
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
  );
}

function BubbleView({ features }: ViewProps) {
  const absValues = features.map((f) => Math.abs(f.value));
  const maxAbs = Math.max(...absValues);
  const minAbs = Math.min(...absValues);
  const span = maxAbs - minAbs;

  return (
    <div className="shap-chart__bubble-wrap" role="list">
      {features.map((f, i) => {
        const pos = BUBBLE_POS[i] ?? BUBBLE_POS[BUBBLE_POS.length - 1];
        const ratio = span > 0 ? (Math.abs(f.value) - minAbs) / span : 0.5;
        const r = MIN_BUBBLE_R + ratio * (MAX_BUBBLE_R - MIN_BUBBLE_R);
        const isLarge = i < 2;
        return (
          <div
            key={f.name}
            role="listitem"
            className={`shap-chart__bubble ${isLarge ? '' : 'shap-chart__bubble--small'}`}
            style={{
              left: pos.cx,
              top: pos.cy,
              width: `${r * 2}px`,
              height: `${r * 2}px`,
              backgroundColor: SHAP_COLORS[i % SHAP_COLORS.length],
            }}
            title={tooltipText(f)}
          >
            <span className="shap-chart__bubble-name">{f.name}</span>
            {isLarge && (
              <span className="shap-chart__bubble-value">{f.value.toFixed(2)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ShapChart({ features, topN = 5 }: ShapChartProps) {
  const [view, setView] = useState<'block' | 'bubble'>('block');

  if (features.length === 0) {
    return (
      <div className="shap-chart shap-chart--empty">SHAP 데이터가 없습니다.</div>
    );
  }

  const sorted = [...features].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value),
  );
  const top = sorted.slice(0, topN);

  return (
    <div className="shap-chart">
      <div className="shap-chart__head">
        <p className="shap-chart__note">
          값은 모델 내부 기여도(상대값)이며 확률 %p와 다를 수 있음
        </p>
        <div
          className="shap-chart__toggle"
          role="tablist"
          aria-label="SHAP 보기 방식"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'block'}
            className={`shap-chart__toggle-btn ${view === 'block' ? 'is-active' : ''}`}
            onClick={() => setView('block')}
            aria-label="블록 뷰"
            title="블록 뷰"
          >
            <LayoutList size={16} />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'bubble'}
            className={`shap-chart__toggle-btn ${view === 'bubble' ? 'is-active' : ''}`}
            onClick={() => setView('bubble')}
            aria-label="버블 뷰"
            title="버블 뷰"
          >
            <Circle size={16} />
          </button>
        </div>
      </div>

      {view === 'block' ? <BlockView features={top} /> : <BubbleView features={top} />}
    </div>
  );
}
