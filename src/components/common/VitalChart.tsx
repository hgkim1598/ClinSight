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
import { DOT_INFO, TABS, TAB_CONFIG } from './vitals/vitalConfig';
import type { DotType } from './vitals/vitalConfig';
import { computeAxis, computeDotsOnlyAxis } from './vitals/axisUtils';
import { useSnackbar } from '../../context/useSnackbar';

/** 비교 모드 지원: line 시리즈가 1개 이상 있는 표준 탭만. (sofa/vs는 별도 렌더라 제외) */
function isLineTab(key: TabKey): boolean {
  const cfg = TAB_CONFIG[key];
  return cfg != null && cfg.lines.length > 0;
}
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
  // 비교 모드 — 활성 탭과 다른 탭의 line 시리즈를 한 차트에 겹쳐 본다 (피드백 §6-1).
  const [compareMode, setCompareMode] = useState(false);
  const [compareTab, setCompareTab] = useState<TabKey | null>(null);
  const { show: showSnackbar } = useSnackbar();

  // 활성 탭이 바뀌면 비교 대상도 리셋 (render-time prop sync).
  const [prevActive, setPrevActive] = useState(active);
  if (prevActive !== active) {
    setPrevActive(active);
    setCompareTab(null);
    if (!isLineTab(active)) setCompareMode(false);
  }

  const compareSupported = isLineTab(active);

  const handleTabClick = (key: TabKey) => {
    if (compareMode && key !== active) {
      if (!isLineTab(key)) {
        showSnackbar({
          message: '이 탭은 비교 모드를 지원하지 않습니다.',
          type: 'info',
        });
        return;
      }
      setCompareTab(key);
      return;
    }
    setActive(key);
  };

  const renderTabs = () => (
    <div className="vital-chart__tabs" role="tablist">
      {TABS.map((t) => {
        const isOn = active === t.key;
        const isCompare = compareTab === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isOn}
            className={`vital-chart__tab ${isOn ? 'is-active' : ''} ${isCompare ? 'is-compare' : ''}`}
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
      disabled={!compareSupported}
      aria-pressed={compareMode}
      aria-label={compareMode ? '비교 모드 종료' : '비교 모드 시작'}
      title={
        !compareSupported
          ? '이 탭은 비교 모드를 지원하지 않습니다'
          : compareMode
            ? '비교 모드 종료'
            : '두 탭을 겹쳐서 비교'
      }
      onClick={() => {
        if (!compareSupported) return;
        setCompareMode((v) => !v);
        setCompareTab(null);
      }}
    >
      <Layers size={18} />
    </button>
  );

  // 비교 모드: 활성 탭(라인 1개) + 비교 탭(라인 1개)을 dual-axis로 겹쳐 표시.
  if (compareMode && compareTab && compareSupported) {
    const primaryCfg = TAB_CONFIG[active]!;
    const compareCfg = TAB_CONFIG[compareTab]!;
    const primary = vitals.series[primaryCfg.lines[0]];
    const secondary = vitals.series[compareCfg.lines[0]];
    return (
      <section className="vital-chart">
        <header className="vital-chart__head">
          {renderTabs()}
          {renderCompareBtn()}
          <div className="vital-chart__meta">
            <span className="vital-chart__compare-hint">
              겹쳐보기: <b>{primary.label}</b> ↔ <b>{secondary.label}</b>
            </span>
          </div>
        </header>
        <div className="vital-chart__canvas">
          <CompareChart primary={primary} secondary={secondary} />
        </div>
      </section>
    );
  }

  // 비교 모드 켜진 상태인데 아직 비교 대상 미선택 — 안내 노출.
  if (compareMode && !compareTab && compareSupported) {
    const primaryCfg = TAB_CONFIG[active]!;
    const primary = vitals.series[primaryCfg.lines[0]];
    return (
      <section className="vital-chart">
        <header className="vital-chart__head">
          {renderTabs()}
          {renderCompareBtn()}
          <div className="vital-chart__meta">
            <span className="vital-chart__compare-hint">
              비교할 탭을 선택하세요 (현재: <b>{primary.label}</b>)
            </span>
          </div>
        </header>
        <div className="vital-chart__empty">
          탭 바에서 겹쳐볼 다른 탭을 클릭하세요.
        </div>
      </section>
    );
  }

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
// 비교 모드 — 두 line 시리즈를 한 차트에 겹쳐 표시
// (피드백 §6-1: 여러 항목을 한 번에 비교)
//   - Dual Y-axis: 왼쪽 primary, 오른쪽 secondary
//   - secondary는 점선(strokeDasharray)으로 시각 구분
//   - Y축은 각 시리즈의 정상범위+데이터로 자동 계산 (computeAxis)
// ============================================================

interface CompareChartProps {
  primary: VitalSeries;
  secondary: VitalSeries;
}

function CompareChart({ primary, secondary }: CompareChartProps) {
  const leftAxis = computeAxis(primary, false);
  const rightAxis = computeAxis(secondary, false);
  const times = primary.times.length > 0 ? primary.times : secondary.times;
  const data = times.map((t, i) => ({
    t,
    p: primary.data[i] ?? null,
    s: secondary.data[i] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="t"
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          stroke="var(--border)"
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[leftAxis.yMin, leftAxis.yMax]}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          stroke="var(--border)"
          width={40}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[rightAxis.yMin, rightAxis.yMax]}
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
          formatter={(value, name) => {
            if (name === 'p')
              return [`${value ?? '—'} ${primary.unit}`, primary.label];
            if (name === 's')
              return [`${value ?? '—'} ${secondary.unit}`, secondary.label];
            return [String(value ?? ''), String(name)];
          }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="p"
          stroke="var(--chart-line-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--chart-line-1)' }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="s"
          stroke="var(--chart-line-2)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 3, fill: 'var(--chart-line-2)' }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
