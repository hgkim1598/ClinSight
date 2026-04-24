import type { RiskTone, TrendPoint } from '../../types';
import './TrendBar.css';

interface TrendBarProps {
  trend: TrendPoint[];
  tone: RiskTone;
}

function pick4Points(trend: TrendPoint[]): TrendPoint[] {
  if (trend.length === 0) return [];
  // 요구사항: -6h, -4h, -2h, 현재 (2시간 간격 4포인트)
  const byLabel = new Map(trend.map((p) => [p.t, p]));
  const preferred = ['-6h', '-4h', '-2h', '현재'];
  const matched = preferred
    .map((label) => byLabel.get(label))
    .filter((p): p is TrendPoint => p != null);
  if (matched.length === 4) return matched;
  // fallback: 균등 샘플링
  const step = Math.max(1, Math.floor(trend.length / 4));
  return [trend[0], trend[step], trend[step * 2], trend[trend.length - 1]];
}

export default function TrendBar({ trend, tone }: TrendBarProps) {
  const points = pick4Points(trend);
  if (points.length === 0) {
    return (
      <div className="trend-bar trend-bar--empty">확률 추이 데이터가 없습니다.</div>
    );
  }
  const max = Math.max(100, ...points.map((p) => p.pct));

  return (
    <div className="trend-bar">
      <div className="trend-bar__meta">6시간 · 2시간 간격</div>
      <ul className={`trend-bar__list trend-bar__list--${tone}`}>
        {points.map((p) => {
          const widthPct = Math.round((p.pct / max) * 100);
          return (
            <li key={p.t} className="trend-bar__row">
              <span className="trend-bar__time">{p.t}</span>
              <div className="trend-bar__track">
                <div className="trend-bar__fill" style={{ width: `${widthPct}%` }} />
              </div>
              <span className="trend-bar__pct">{p.pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
