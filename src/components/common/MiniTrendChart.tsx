import type { TrendPoint } from '../../types';
import './MiniTrendChart.css';

interface MiniTrendChartProps {
  trend: TrendPoint[];
}

function toneClass(pct: number): string {
  if (pct >= 60) return 'mini-trend__bar--danger';
  if (pct >= 30) return 'mini-trend__bar--warn';
  return 'mini-trend__bar--safe';
}

export default function MiniTrendChart({ trend }: MiniTrendChartProps) {
  if (trend.length === 0) return null;

  const points = trend.slice(-5);
  const values = points.map((p) => p.pct);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rangeMin = min * 0.8;
  const rangeMax = max;
  const span = rangeMax - rangeMin;

  return (
    <div className="mini-trend" aria-hidden="true">
      {points.map((p, i) => {
        const heightPct = min === max ? 50 : ((p.pct - rangeMin) / span) * 100;
        return (
          <div
            key={`${p.t}-${i}`}
            className={`mini-trend__bar ${toneClass(p.pct)}`}
            style={{ height: `max(2px, ${heightPct}%)` }}
          />
        );
      })}
    </div>
  );
}
