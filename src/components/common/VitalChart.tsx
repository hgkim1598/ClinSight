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
import type { LabDot, TabKey, VitalData, VitalSeries } from '../../types';
import SofaPanel from './SofaPanel';
import {
  DOT_INFO,
  TABS,
  TAB_CONFIG,
  VS_PANEL_CONFIGS,
} from './vitals/vitalConfig';
import type { DotType } from './vitals/vitalConfig';
import { computeAxis, computeDotsOnlyAxis } from './vitals/axisUtils';
import {
  BilirubinShape,
  CreShape,
  LacShape,
  PfRatioShape,
  PlateletShape,
} from './vitals/chartShapes';
import './VitalChart.css';

interface VitalChartProps {
  vitals: VitalData;
  patientId: string;
}

export default function VitalChart({ vitals, patientId }: VitalChartProps) {
  const [active, setActive] = useState<TabKey>('sofa');

  const renderTabs = () => (
    <div className="vital-chart__tabs" role="tablist">
      {TABS.map((t) => {
        const isOn = active === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isOn}
            className={`vital-chart__tab ${isOn ? 'is-active' : ''}`}
            onClick={() => setActive(t.key)}
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
      className="vital-chart__compare-btn"
      disabled
      aria-label="비교 모드 (준비 중)"
      title="비교 모드 (준비 중)"
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

  if (active === 'vs') {
    return (
      <section className="vital-chart">
        <header className="vital-chart__head">
          {renderTabs()}
          {renderCompareBtn()}
        </header>
        <div className="vital-chart__vs-grid">
          {VS_PANEL_CONFIGS.map((panel, i) =>
            panel.kind === 'dual' ? (
              <VsDualPanel
                key={i}
                title={panel.title}
                left={vitals.series[panel.leftKey]}
                right={vitals.series[panel.rightKey]}
              />
            ) : (
              <VsSinglePanel
                key={i}
                title={panel.title}
                series={vitals.series[panel.key]}
              />
            ),
          )}
        </div>
      </section>
    );
  }

  const config = TAB_CONFIG[active];
  if (!config) return null;

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
  const isCns = active === 'cns';

  const series1 = config.lines[0] ? vitals.series[config.lines[0]] : null;
  const series2 = config.lines[1] ? vitals.series[config.lines[1]] : null;

  const filteredLabs = vitals.labs.filter((l) => config.dots.includes(l.type));

  const axis1 = series1 ? computeAxis(series1, config.dots.length > 0) : null;
  const axis2 = series2 ? computeAxis(series2, false) : null;
  const dotsOnlyAxis = isDotsOnly
    ? computeDotsOnlyAxis(filteredLabs.map((l) => l.value))
    : null;

  // 라인이 있으면 점은 하단 띠 영역에 배치, 없으면 실제 측정값에 배치
  const dotYFor = (lab: LabDot | undefined): number | null => {
    if (!lab) return null;
    if (axis1) return axis1.rawMin - axis1.labBand * DOT_INFO[lab.type].bandOffset;
    return lab.value;
  };

  const baseTimes = series1?.times ?? series2?.times ?? vitals.series.hr.times;

  const findLab = (t: string, type: DotType): LabDot | undefined =>
    config.dots.includes(type)
      ? filteredLabs.find((l) => l.time === t && l.type === type)
      : undefined;

  const chartData = baseTimes.map((t, i) => {
    const v1 = series1 ? series1.data[i] : null;
    const v2 = series2 ? series2.data[i] : null;
    const lacLab = findLab(t, 'lac');
    const creLab = findLab(t, 'cre');
    const pfLab = findLab(t, 'pf_ratio');
    const pltLab = findLab(t, 'platelet');
    const bilLab = findLab(t, 'bilirubin');

    const withinNormal =
      isSingle && v1 != null && axis1
        ? v1 >= axis1.normalLow && v1 <= axis1.normalHigh
        : true;

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
  const latestDot =
    primaryDotLabs.length > 0 ? primaryDotLabs[primaryDotLabs.length - 1] : null;

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

// ============================================================
// V/S 탭 — 3-chart 가로 배치를 위한 서브 패널
// (피드백 §2-1, §6-2: BP/HR/RR/SpO2/Temp 5개를 한 세트로 본다.
//  세로 스택 금지 — Dual Y-axis 2개 + 단독 1개를 가로로 배치)
// ============================================================

interface VsDualPanelProps {
  title: string;
  left: VitalSeries;
  right: VitalSeries;
}

function VsDualPanel({ title, left, right }: VsDualPanelProps) {
  const leftAxis = computeAxis(left, false);
  const rightAxis = computeAxis(right, false);
  const times = left.times.length > 0 ? left.times : right.times;
  const data = times.map((t, i) => ({
    t,
    l: left.data[i] ?? null,
    r: right.data[i] ?? null,
  }));
  const currentL = left.data.length > 0 ? left.data[left.data.length - 1] : null;
  const currentR = right.data.length > 0 ? right.data[right.data.length - 1] : null;

  return (
    <div className="vs-panel">
      <header className="vs-panel__head">
        <span className="vs-panel__title">{title}</span>
        <span className="vs-panel__meta">
          <span style={{ color: 'var(--chart-line-1)' }}>
            {left.label} {currentL != null ? currentL : '—'} {left.unit}
          </span>
          {' · '}
          <span style={{ color: 'var(--chart-line-2)' }}>
            {right.label} {currentR != null ? currentR : '—'} {right.unit}
          </span>
        </span>
      </header>
      <div className="vs-panel__canvas">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              stroke="var(--border)"
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[leftAxis.yMin, leftAxis.yMax]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              stroke="var(--border)"
              width={32}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[rightAxis.yMin, rightAxis.yMax]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              stroke="var(--border)"
              width={32}
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
              formatter={(value, name) => {
                if (name === 'l')
                  return [`${value ?? '—'} ${left.unit}`, left.label];
                if (name === 'r')
                  return [`${value ?? '—'} ${right.unit}`, right.label];
                return [String(value ?? ''), String(name)];
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="l"
              stroke="var(--chart-line-1)"
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--chart-line-1)' }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="r"
              stroke="var(--chart-line-2)"
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--chart-line-2)' }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface VsSinglePanelProps {
  title: string;
  series: VitalSeries;
}

function VsSinglePanel({ title, series }: VsSinglePanelProps) {
  const axis = computeAxis(series, false);
  const data = series.times.map((t, i) => ({ t, v: series.data[i] ?? null }));
  const current =
    series.data.length > 0 ? series.data[series.data.length - 1] : null;

  return (
    <div className="vs-panel">
      <header className="vs-panel__head">
        <span className="vs-panel__title">{title}</span>
        <span className="vs-panel__meta">
          {series.label} {current != null ? current : '—'} {series.unit}
        </span>
      </header>
      <div className="vs-panel__canvas">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              stroke="var(--border)"
            />
            <YAxis
              domain={[axis.yMin, axis.yMax]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              stroke="var(--border)"
              width={32}
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
              formatter={(value) => [
                `${value ?? '—'} ${series.unit}`,
                series.label,
              ]}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--primary)' }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
