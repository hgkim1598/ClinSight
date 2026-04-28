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
import type { LabDot, TabKey, VitalData, VitalKey, VitalSeries } from '../../types';
import SofaPanel from './SofaPanel';
import './VitalChart.css';

interface VitalChartProps {
  vitals: VitalData;
  patientId: string;
}

type DotType = LabDot['type'];

interface TabConfig {
  lines: VitalKey[];
  dots: DotType[];
  yAxisLabel?: string;
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'sofa', label: 'SOFA' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'resp', label: 'Resp' },
  { key: 'renal', label: 'Renal' },
  { key: 'cns', label: 'CNS' },
  { key: 'coag', label: 'Coag' },
  { key: 'hepatic', label: 'Hepatic' },
  { key: 'temp', label: 'Temp' },
];

const TAB_CONFIG: Record<TabKey, TabConfig | null> = {
  sofa: null,
  cardio: { lines: ['map', 'hr'], dots: ['lac'], yAxisLabel: 'mmHg / bpm' },
  resp: { lines: ['spo2', 'rr'], dots: ['pf_ratio'], yAxisLabel: '% / /min' },
  renal: { lines: ['urine_output'], dots: ['cre'], yAxisLabel: 'mL/h' },
  cns: { lines: ['gcs'], dots: [], yAxisLabel: '' },
  coag: { lines: [], dots: ['platelet'], yAxisLabel: '×10³/μL' },
  hepatic: { lines: [], dots: ['bilirubin'], yAxisLabel: 'mg/dL' },
  temp: { lines: ['temp'], dots: [], yAxisLabel: '°C' },
};

const CRE_DANGER_THRESHOLD = 2.0;

interface DotInfo {
  label: string;
  unit: string;
  /** 임계치 기반 색상 분기 */
  color: (v: number) => string;
  /** 라인이 있을 때 하단 띠 안에서의 위치 (0=상단, 1=하단) */
  bandOffset: number;
}

const DOT_INFO: Record<DotType, DotInfo> = {
  lac: {
    label: 'Lactate',
    unit: 'mmol/L',
    color: () => 'var(--warn)',
    bandOffset: 0.35,
  },
  cre: {
    label: 'Creatinine',
    unit: 'mg/dL',
    color: (v) => (v > CRE_DANGER_THRESHOLD ? 'var(--danger)' : 'var(--warn)'),
    bandOffset: 0.75,
  },
  pf_ratio: {
    label: 'P/F Ratio',
    unit: '',
    color: () => 'var(--warn)',
    bandOffset: 0.5,
  },
  platelet: {
    label: 'Platelet',
    unit: '×10³/μL',
    color: (v) => (v >= 150 ? 'var(--safe)' : v >= 100 ? 'var(--warn)' : 'var(--danger)'),
    bandOffset: 0.5,
  },
  bilirubin: {
    label: 'Bilirubin',
    unit: 'mg/dL',
    color: (v) => (v < 1.2 ? 'var(--safe)' : v < 6.0 ? 'var(--warn)' : 'var(--danger)'),
    bandOffset: 0.5,
  },
};

interface DotShapeProps {
  cx?: number;
  cy?: number;
  payload?: Record<string, number | null | undefined>;
}

function LacShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.lacValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={DOT_INFO.lac.color(v)} stroke="var(--card)" strokeWidth={1} />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Lac {v}
      </text>
    </g>
  );
}

function CreShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.creValue;
  if (cx == null || cy == null || v == null) return null;
  const elevated = v > CRE_DANGER_THRESHOLD;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={DOT_INFO.cre.color(v)} stroke="var(--card)" strokeWidth={1} />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Cre {v}
        {elevated ? '↑' : ''}
      </text>
    </g>
  );
}

function PfRatioShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.pfValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={DOT_INFO.pf_ratio.color(v)} stroke="var(--card)" strokeWidth={1} />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        P/F {v}
      </text>
    </g>
  );
}

function PlateletShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.pltValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={DOT_INFO.platelet.color(v)} stroke="var(--card)" strokeWidth={1} />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Plt {v}
      </text>
    </g>
  );
}

function BilirubinShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.bilValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={DOT_INFO.bilirubin.color(v)} stroke="var(--card)" strokeWidth={1} />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Bil {v}
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

function computeDotsOnlyAxis(values: number[]): AxisRange {
  const rawMin = values.length > 0 ? Math.min(...values) : 0;
  const rawMax = values.length > 0 ? Math.max(...values) : 1;
  const range = Math.max(rawMax - rawMin, 1);
  const pad = range * 0.3;
  return {
    yMin: Math.max(0, rawMin - pad),
    yMax: rawMax + pad,
    rawMin,
    labBand: 0,
    normalLow: 0,
    normalHigh: 0,
  };
}

export default function VitalChart({ vitals, patientId }: VitalChartProps) {
  const [selected, setSelected] = useState<TabKey[]>(['cardio']);
  const [compareMode, setCompareMode] = useState(false);

  const active = selected[0];
  const isCompare = compareMode && selected.length === 2;

  const isCompareEligible = (key: TabKey): boolean => {
    const cfg = TAB_CONFIG[key];
    return cfg !== null && cfg.lines.length > 0;
  };

  const handleTabClick = (key: TabKey) => {
    if (!compareMode) {
      setSelected([key]);
      return;
    }
    if (!isCompareEligible(key)) {
      setCompareMode(false);
      setSelected([key]);
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
    if (!isCompareEligible(active)) return;
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
        const isOn = selected.includes(t.key);
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isOn}
            className={`vital-chart__tab ${isOn ? 'is-active' : ''}`}
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
      disabled={!isCompareEligible(active)}
      aria-pressed={compareMode}
      aria-label="비교 모드"
      title="비교 모드"
    >
      <Layers size={18} />
    </button>
  );

  if (active === 'sofa') {
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

  const baseConfig = TAB_CONFIG[active];
  if (!baseConfig) return null;

  // 비교 모드에서 두 탭이 모두 선택된 경우, 각 탭의 lines[0]을 합쳐 듀얼 라인으로 합성
  let config: TabConfig = baseConfig;
  if (isCompare) {
    const cfg1 = TAB_CONFIG[selected[0]];
    const cfg2 = TAB_CONFIG[selected[1]];
    if (cfg1 && cfg2 && cfg1.lines.length > 0 && cfg2.lines.length > 0) {
      config = {
        lines: [cfg1.lines[0], cfg2.lines[0]],
        dots: [...cfg1.dots, ...cfg2.dots],
      };
    }
  }

  const isEmpty = config.lines.length === 0 && config.dots.length === 0;
  if (isEmpty) {
    return (
      <section className="vital-chart">
        <header className="vital-chart__head">
          {renderTabs()}
          {renderCompareBtn()}
        </header>
        <div className="vital-chart__empty">데이터가 없습니다.</div>
      </section>
    );
  }

  const isMulti = config.lines.length === 2;
  const isSingle = config.lines.length === 1;
  const isDotsOnly = config.lines.length === 0 && config.dots.length > 0;
  const isCns = !isCompare && active === 'cns';

  const series1 = config.lines[0] ? vitals.series[config.lines[0]] : null;
  const series2 = config.lines[1] ? vitals.series[config.lines[1]] : null;

  const filteredLabs = vitals.labs.filter((l) => config.dots.includes(l.type));

  const axis1 = series1 ? computeAxis(series1, config.dots.length > 0) : null;
  const axis2 = series2 ? computeAxis(series2, false) : null;
  const dotsOnlyAxis = isDotsOnly ? computeDotsOnlyAxis(filteredLabs.map((l) => l.value)) : null;

  // 라인이 있으면 점은 하단 띠 영역에 배치, 없으면 실제 측정값에 배치
  const dotYFor = (lab: LabDot | undefined): number | null => {
    if (!lab) return null;
    if (axis1) return axis1.rawMin - axis1.labBand * DOT_INFO[lab.type].bandOffset;
    return lab.value;
  };

  const baseTimes = series1?.times ?? series2?.times ?? vitals.series.hr.times;

  const findLab = (t: string, type: DotType): LabDot | undefined =>
    config.dots.includes(type) ? filteredLabs.find((l) => l.time === t && l.type === type) : undefined;

  const chartData = baseTimes.map((t, i) => {
    const v1 = series1 ? series1.data[i] : null;
    const v2 = series2 ? series2.data[i] : null;
    const lacLab = findLab(t, 'lac');
    const creLab = findLab(t, 'cre');
    const pfLab = findLab(t, 'pf_ratio');
    const pltLab = findLab(t, 'platelet');
    const bilLab = findLab(t, 'bilirubin');

    const withinNormal =
      isSingle && v1 != null && axis1 ? v1 >= axis1.normalLow && v1 <= axis1.normalHigh : true;

    return {
      t,
      value: v1,
      value2: v2,
      normalBand: axis1 ? axis1.normalHigh - axis1.normalLow : 0,
      normalBase: axis1 ? axis1.normalLow : 0,
      dotOn: isSingle && !isCns && !withinNormal ? v1 : null,
      lacY: dotYFor(lacLab),
      lacValue: lacLab?.value ?? null,
      creY: dotYFor(creLab),
      creValue: creLab?.value ?? null,
      pfY: dotYFor(pfLab),
      pfValue: pfLab?.value ?? null,
      pltY: dotYFor(pltLab),
      pltValue: pltLab?.value ?? null,
      bilY: dotYFor(bilLab),
      bilValue: bilLab?.value ?? null,
    };
  });

  const current1 = series1 && series1.data.length > 0 ? series1.data[series1.data.length - 1] : null;
  const current2 = series2 && series2.data.length > 0 ? series2.data[series2.data.length - 1] : null;

  const hasData =
    (series1?.data.length ?? 0) > 0 ||
    (series2?.data.length ?? 0) > 0 ||
    filteredLabs.length > 0;

  const primaryDotType = config.dots[0] ?? null;
  const primaryDotLabs = primaryDotType
    ? filteredLabs.filter((l) => l.type === primaryDotType)
    : [];
  const latestDot = primaryDotLabs.length > 0 ? primaryDotLabs[primaryDotLabs.length - 1] : null;

  const single1Domain: [number, number] | undefined =
    isSingle && axis1 ? (isCns ? [3, 15] : [axis1.yMin, axis1.yMax]) : undefined;

  const renderDotMeta = () =>
    primaryDotType && latestDot ? (
      <span className="vital-chart__current">
        <span className="vital-chart__label">{DOT_INFO[primaryDotType].label}</span>
        <span
          className="vital-chart__value"
          style={{ color: DOT_INFO[primaryDotType].color(latestDot.value) }}
        >
          {latestDot.value}
          <span className="vital-chart__unit"> {DOT_INFO[primaryDotType].unit}</span>
        </span>
      </span>
    ) : null;

  return (
    <section className="vital-chart">
      <header className="vital-chart__head">
        {renderTabs()}
        {renderCompareBtn()}
        <div className="vital-chart__meta">
          {isMulti && series1 && series2 ? (
            <>
              <span className="vital-chart__current">
                <span className="vital-chart__label" style={{ color: 'var(--chart-line-1)' }}>
                  {series1.label}
                </span>
                <span className="vital-chart__value">
                  {current1 != null ? current1 : '—'}
                  <span className="vital-chart__unit"> {series1.unit}</span>
                </span>
              </span>
              <span className="vital-chart__current">
                <span className="vital-chart__label" style={{ color: 'var(--chart-line-2)' }}>
                  {series2.label}
                </span>
                <span className="vital-chart__value">
                  {current2 != null ? current2 : '—'}
                  <span className="vital-chart__unit"> {series2.unit}</span>
                </span>
              </span>
            </>
          ) : isSingle && series1 && axis1 ? (
            <>
              <span className="vital-chart__current">
                <span className="vital-chart__label">{series1.label}</span>
                <span className="vital-chart__value">
                  {current1 != null ? current1 : '—'}
                  <span className="vital-chart__unit"> {series1.unit}</span>
                </span>
              </span>
              {axis1.normalLow !== axis1.normalHigh && (
                <span className="vital-chart__normal">
                  정상 범위 {axis1.normalLow}–{axis1.normalHigh} {series1.unit}
                </span>
              )}
              {renderDotMeta()}
            </>
          ) : isDotsOnly ? (
            renderDotMeta()
          ) : null}
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
              {isMulti && axis1 && axis2 ? (
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
              ) : isSingle && single1Domain ? (
                <YAxis
                  domain={single1Domain}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  width={40}
                />
              ) : isDotsOnly && dotsOnlyAxis ? (
                <YAxis
                  domain={[dotsOnlyAxis.yMin, dotsOnlyAxis.yMax]}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  width={40}
                />
              ) : null}
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
                  if (name === 'value' && series1) {
                    return [`${value ?? '—'} ${series1.unit}`, series1.label];
                  }
                  if (name === 'value2' && series2) {
                    return [`${value ?? '—'} ${series2.unit}`, series2.label];
                  }
                  if (name === 'lacY') {
                    const v = item?.payload?.lacValue;
                    return v != null
                      ? [`${v} ${DOT_INFO.lac.unit}`, DOT_INFO.lac.label]
                      : [null, null];
                  }
                  if (name === 'creY') {
                    const v = item?.payload?.creValue;
                    return v != null
                      ? [`${v} ${DOT_INFO.cre.unit}`, DOT_INFO.cre.label]
                      : [null, null];
                  }
                  if (name === 'pfY') {
                    const v = item?.payload?.pfValue;
                    return v != null ? [`${v}`, DOT_INFO.pf_ratio.label] : [null, null];
                  }
                  if (name === 'pltY') {
                    const v = item?.payload?.pltValue;
                    return v != null
                      ? [`${v} ${DOT_INFO.platelet.unit}`, DOT_INFO.platelet.label]
                      : [null, null];
                  }
                  if (name === 'bilY') {
                    const v = item?.payload?.bilValue;
                    return v != null
                      ? [`${v} ${DOT_INFO.bilirubin.unit}`, DOT_INFO.bilirubin.label]
                      : [null, null];
                  }
                  return [String(value ?? ''), String(name)];
                }}
              />
              {isSingle && axis1 && !isCns && axis1.normalLow !== axis1.normalHigh && (
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
              {isMulti && (
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
                  {config.dots.includes('lac') && (
                    <Scatter yAxisId="left" dataKey="lacY" shape={<LacShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('cre') && (
                    <Scatter yAxisId="left" dataKey="creY" shape={<CreShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('pf_ratio') && (
                    <Scatter yAxisId="left" dataKey="pfY" shape={<PfRatioShape />} isAnimationActive={false} />
                  )}
                </>
              )}
              {isSingle && (
                <>
                  <Line
                    type={isCns ? 'stepAfter' : 'monotone'}
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--primary)', stroke: 'var(--primary)' }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  {!isCns && <Scatter dataKey="dotOn" fill="var(--warn)" shape="circle" />}
                  {config.dots.includes('lac') && (
                    <Scatter dataKey="lacY" shape={<LacShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('cre') && (
                    <Scatter dataKey="creY" shape={<CreShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('pf_ratio') && (
                    <Scatter dataKey="pfY" shape={<PfRatioShape />} isAnimationActive={false} />
                  )}
                </>
              )}
              {isDotsOnly && (
                <>
                  {config.dots.includes('lac') && (
                    <Scatter dataKey="lacY" shape={<LacShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('cre') && (
                    <Scatter dataKey="creY" shape={<CreShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('pf_ratio') && (
                    <Scatter dataKey="pfY" shape={<PfRatioShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('platelet') && (
                    <Scatter dataKey="pltY" shape={<PlateletShape />} isAnimationActive={false} />
                  )}
                  {config.dots.includes('bilirubin') && (
                    <Scatter dataKey="bilY" shape={<BilirubinShape />} isAnimationActive={false} />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="vital-chart__empty">데이터가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
