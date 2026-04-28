import { useState } from 'react';
import { Layers } from 'lucide-react';
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
import type { VitalData, VitalKey, VitalSeries } from '../../types';
import SofaPanel from './SofaPanel';
import './VitalChart.css';

type TabKey = VitalKey | 'sofa';

interface VitalChartProps {
  vitals: VitalData;
  patientId: string;
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'sofa', label: 'SOFA' },
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

interface AxisRange {
  yMin: number;
  yMax: number;
  rawMin: number;
  labBand: number;
  normalLow: number;
  normalHigh: number;
}

function computeAxis(series: VitalSeries, withLabBand: boolean): AxisRange {
  const [normalLow, normalHigh] = series.normal;
  const hasData = series.data.length > 0;
  const rawMin = hasData ? Math.min(normalLow, ...series.data) : normalLow;
  const rawMax = hasData ? Math.max(normalHigh, ...series.data) : normalHigh;
  const range = Math.max(rawMax - rawMin, 1);
  const labBand = range * 0.2;
  const yMin = withLabBand ? rawMin - labBand - 2 : rawMin - 2;
  const yMax = rawMax + 4;
  return { yMin, yMax, rawMin, labBand, normalLow, normalHigh };
}

export default function VitalChart({ vitals, patientId }: VitalChartProps) {
  const [selected, setSelected] = useState<TabKey[]>(['hr']);
  const [compareMode, setCompareMode] = useState(false);

  const isSofa = selected.length === 1 && selected[0] === 'sofa';
  const isDual = selected.length === 2;

  const handleTabClick = (key: TabKey) => {
    if (!compareMode) {
      setSelected([key]);
      return;
    }
    if (key === 'sofa') {
      setCompareMode(false);
      setSelected(['sofa']);
      return;
    }
    setSelected((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  };

  const toggleCompareMode = () => {
    if (isSofa) return;
    if (compareMode) {
      setSelected((prev) => [prev[0]]);
      setCompareMode(false);
    } else {
      setCompareMode(true);
    }
  };

  const renderTabs = () => (
    <div className="vital-chart__tabs" role="tablist">
      {TABS.map((t) => {
        const active = selected.includes(t.key);
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            className={`vital-chart__tab ${active ? 'is-active' : ''}`}
            onClick={() => handleTabClick(t.key)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  const renderCompareBtn = () => (
    <button
      type="button"
      className={`vital-chart__compare-btn ${compareMode ? 'is-active' : ''}`}
      onClick={toggleCompareMode}
      disabled={isSofa}
      aria-pressed={compareMode}
      aria-label="비교 모드"
      title="비교 모드"
    >
      <Layers size={18} />
    </button>
  );

  if (isSofa) {
    return (
      <section className="vital-chart">
        <header className="vital-chart__head">
          {renderTabs()}
          {renderCompareBtn()}
        </header>
        <div className="vital-chart__canvas">
          <SofaPanel patientId={patientId} />
        </div>
      </section>
    );
  }

  const key1 = selected[0] as VitalKey;
  const series1 = vitals.series[key1];
  const axis1 = computeAxis(series1, true);
  const lacY = axis1.rawMin - axis1.labBand * 0.35;
  const creY = axis1.rawMin - axis1.labBand * 0.75;

  const key2 = isDual ? (selected[1] as VitalKey) : null;
  const series2 = key2 ? vitals.series[key2] : null;
  const axis2 = series2 ? computeAxis(series2, false) : null;

  const hasData = series1.data.length > 0 || (series2?.data.length ?? 0) > 0;
  const current1 = series1.data.length > 0 ? series1.data[series1.data.length - 1] : null;
  const current2 =
    series2 && series2.data.length > 0 ? series2.data[series2.data.length - 1] : null;

  const chartData = series1.times.map((t, i) => {
    const v1 = series1.data[i];
    const v2 = series2 ? series2.data[i] : null;
    const withinNormal = v1 != null && v1 >= axis1.normalLow && v1 <= axis1.normalHigh;
    const labsAtTime = vitals.labs.filter((l) => l.time === t);
    const lacLab = labsAtTime.find((l) => l.label === 'Lac');
    const creLab = labsAtTime.find((l) => l.label === 'Cre');
    return {
      t,
      value: v1,
      value2: v2,
      normalBand: axis1.normalHigh - axis1.normalLow,
      normalBase: axis1.normalLow,
      dotOn: withinNormal ? null : v1,
      lacY: lacLab ? lacY : null,
      lacValue: lacLab?.value ?? null,
      creY: creLab ? creY : null,
      creValue: creLab?.value ?? null,
    };
  });

  return (
    <section className="vital-chart">
      <header className="vital-chart__head">
        {renderTabs()}
        {renderCompareBtn()}
        <div className="vital-chart__meta">
          {isDual && series2 ? (
            <>
              <span className="vital-chart__current">
                <span
                  className="vital-chart__label"
                  style={{ color: 'var(--chart-line-1)' }}
                >
                  {series1.label}
                </span>
                <span className="vital-chart__value">
                  {current1 != null ? current1 : '—'}
                  <span className="vital-chart__unit"> {series1.unit}</span>
                </span>
              </span>
              <span className="vital-chart__current">
                <span
                  className="vital-chart__label"
                  style={{ color: 'var(--chart-line-2)' }}
                >
                  {series2.label}
                </span>
                <span className="vital-chart__value">
                  {current2 != null ? current2 : '—'}
                  <span className="vital-chart__unit"> {series2.unit}</span>
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="vital-chart__current">
                <span className="vital-chart__label">{series1.label}</span>
                <span className="vital-chart__value">
                  {current1 != null ? current1 : '—'}
                  <span className="vital-chart__unit"> {series1.unit}</span>
                </span>
              </span>
              <span className="vital-chart__normal">
                정상 범위 {axis1.normalLow}–{axis1.normalHigh} {series1.unit}
              </span>
            </>
          )}
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
              {isDual && axis2 ? (
                <>
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    domain={[axis1.yMin, axis1.yMax]}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    stroke="var(--border)"
                    width={40}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[axis2.yMin, axis2.yMax]}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    stroke="var(--border)"
                    width={40}
                  />
                </>
              ) : (
                <YAxis
                  domain={[axis1.yMin, axis1.yMax]}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  width={40}
                />
              )}
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
                    return [`${value ?? '—'} ${series1.unit}`, series1.label];
                  }
                  if (name === 'value2' && series2) {
                    return [`${value ?? '—'} ${series2.unit}`, series2.label];
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
              {!isDual && (
                <>
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
                </>
              )}
              {isDual ? (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-line-1)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--chart-line-1)', stroke: 'var(--chart-line-1)' }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="value2"
                    stroke="var(--chart-line-2)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--chart-line-2)', stroke: 'var(--chart-line-2)' }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Scatter
                    yAxisId="left"
                    dataKey="lacY"
                    shape={<LacShape />}
                    isAnimationActive={false}
                  />
                  <Scatter
                    yAxisId="left"
                    dataKey="creY"
                    shape={<CreShape />}
                    isAnimationActive={false}
                  />
                </>
              ) : (
                <>
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
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="vital-chart__empty">바이탈 데이터가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
