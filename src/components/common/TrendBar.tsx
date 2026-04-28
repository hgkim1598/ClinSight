import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RiskTone, TrendPoint } from '../../types';
import './TrendBar.css';

interface TrendBarProps {
  trend: TrendPoint[];
  /** 향후 활용 예정 (현재는 색상 분기에 사용 안 함) */
  tone: RiskTone;
}

interface TooltipPayloadEntry {
  payload: TrendPoint;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const shap = point.shap;
  const hasShap = !!shap && shap.length > 0;

  return (
    <div className="trend-bar__tooltip">
      <div className="trend-bar__tooltip-head">
        <span className="trend-bar__tooltip-time">{point.t}</span>
        <span className="trend-bar__tooltip-pct">{point.pct}%</span>
      </div>
      {hasShap && (
        <>
          <div className="trend-bar__tooltip-divider" />
          <div className="trend-bar__tooltip-section-title">주요 기여 요인</div>
          <ul className="trend-bar__tooltip-list">
            {shap!.map((f) => (
              <li key={f.name} className="trend-bar__tooltip-row">
                <span className="trend-bar__tooltip-name">
                  {f.direction === 'up' ? '↑' : '↓'} {f.name}
                </span>
                <span className="trend-bar__tooltip-value">{f.value.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function TrendBar({ trend }: TrendBarProps) {
  if (trend.length === 0) {
    return (
      <div className="trend-bar trend-bar--empty">확률 추이 데이터가 없습니다.</div>
    );
  }

  return (
    <div className="trend-bar">
      <div className="trend-bar__title">최근 6시간 확률 추이</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            stroke="var(--border)"
            width={36}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--primary)', stroke: 'var(--primary)' }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
