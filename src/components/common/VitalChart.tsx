import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VitalData, VitalKey } from '../../types';
import './VitalChart.css';

interface VitalChartProps {
  vitals: VitalData;
}

const TABS: Array<{ key: VitalKey; label: string }> = [
  { key: 'hr', label: 'HR' },
  { key: 'map', label: 'MAP' },
  { key: 'spo2', label: 'SpO₂' },
  { key: 'rr', label: 'RR' },
  { key: 'temp', label: 'Temp' },
];

const CRE_DANGER_THRESHOLD = 2.0;

interface LabShapeProps {
  cx?: number;
  cy?: number;
  payload?: {
    lacValue?: number | null;
    creValue?: number | null;
  };
}

function LacShape({ cx, cy, payload }: LabShapeProps) {
  if (cx == null || cy == null || payload?.lacValue == null) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="var(--warn)"
        stroke="var(--card)"
        strokeWidth={1}
      />
      <text
        x={cx + 7}
        y={cy + 3.5}
        fontSize={10}
        fill="var(--text-secondary)"
      >
        Lac {payload.lacValue}
      </text>
    </g>
  );
}

function CreShape({ cx, cy, payload }: LabShapeProps) {
  if (cx == null || cy == null || payload?.creValue == null) return null;
  const elevated = payload.creValue > CRE_DANGER_THRESHOLD;
  const color = elevated ? 'var(--danger)' : 'var(--warn)';
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--card)" strokeWidth={1} />
      <text
        x={cx + 7}
        y={cy + 3.5}
        fontSize={10}
        fill="var(--text-secondary)"
      >
        Cre {payload.creValue}
        {elevated ? '↑' : ''}
      </text>
    </g>
  );
}

export default function VitalChart({ vitals }: VitalChartProps) {
  const [active, setActive] = useState<VitalKey>('hr');
  const series = vitals.series[active];
  const hasData = series.data.length > 0;

  const currentValue = hasData ? series.data[series.data.length - 1] : null;
  const [normalLow, normalHigh] = series.normal;

  const rawYMin = hasData ? Math.min(normalLow, ...series.data) : normalLow;
  const rawYMax = hasData ? Math.max(normalHigh, ...series.data) : normalHigh;
  const range = Math.max(rawYMax - rawYMin, 1);
  const labBandHeight = range * 0.2;
  const yMin = rawYMin - labBandHeight - 2;
  const yMax = rawYMax + 4;
  const lacY = rawYMin - labBandHeight * 0.35;
  const creY = rawYMin - labBandHeight * 0.75;

  const chartData = series.times.map((t, i) => {
    const v = series.data[i];
    const withinNormal = v >= normalLow && v <= normalHigh;
    const labsAtTime = vitals.labs.filter((l) => l.time === t);
    const lacLab = labsAtTime.find((l) => l.label === 'Lac');
    const creLab = labsAtTime.find((l) => l.label === 'Cre');
    return {
      t,
      value: v,
      normalBand: normalHigh - normalLow,
      normalBase: normalLow,
      dotOn: withinNormal ? null : v,
      lacY: lacLab ? lacY : null,
      lacValue: lacLab?.value ?? null,
      creY: creLab ? creY : null,
      creValue: creLab?.value ?? null,
    };
  });

  return (
    <section className="vital-chart">
      <header className="vital-chart__head">
        <div className="vital-chart__tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={active === t.key}
              className={`vital-chart__tab ${active === t.key ? 'is-active' : ''}`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="vital-chart__meta">
          <span className="vital-chart__current">
            <span className="vital-chart__label">{series.label}</span>
            <span className="vital-chart__value">
              {currentValue != null ? currentValue : '—'}
              <span className="vital-chart__unit"> {series.unit}</span>
            </span>
          </span>
          <span className="vital-chart__normal">
            정상 범위 {normalLow}–{normalHigh} {series.unit}
          </span>
        </div>
      </header>

      <div className="vital-chart__canvas">
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                stroke="var(--border)"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                stroke="var(--border)"
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--text)',
                }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                formatter={(value, name, item) => {
                  if (name === 'value') {
                    return [`${value ?? '—'} ${series.unit}`, series.label];
                  }
                  if (name === 'lacY') {
                    const v = item?.payload?.lacValue;
                    return v != null ? [`${v}`, 'Lac'] : [null, null];
                  }
                  if (name === 'creY') {
                    const v = item?.payload?.creValue;
                    return v != null ? [`${v}`, 'Cre'] : [null, null];
                  }
                  return [String(value ?? ''), String(name)];
                }}
              />
              <Area
                type="monotone"
                dataKey="normalBase"
                stackId="normal"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="normalBand"
                stackId="normal"
                stroke="none"
                fill="var(--safe-bg)"
                isAnimationActive={false}
                activeDot={false}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary)', stroke: 'var(--primary)' }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Scatter dataKey="dotOn" fill="var(--warn)" shape="circle" />
              <Scatter dataKey="lacY" shape={<LacShape />} isAnimationActive={false} />
              <Scatter dataKey="creY" shape={<CreShape />} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="vital-chart__empty">바이탈 데이터가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
