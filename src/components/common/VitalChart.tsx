import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Layers } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LabDot, TabKey, VitalData } from '../../types';
import SofaPanel from './SofaPanel';
import { DOT_INFO, TABS, TAB_CONFIG } from './vitals/vitalConfig';
import type { DotType, TabConfig } from './vitals/vitalConfig';
import { computeAxis, computeDotsOnlyAxis } from './vitals/axisUtils';
import {
  BilirubinShape,
  CreShape,
  LacShape,
  PfRatioShape,
  PlateletShape,
} from './vitals/chartShapes';
import ManualYAxis, { RECHARTS_XAXIS_HEIGHT } from './charts/ManualYAxis';
import './VitalChart.css';

interface VitalChartProps {
  vitals: VitalData;
  patientId: string;
}

/** 첫 진입 시 가시영역에 보일 시간 폭 (시간 단위). 24h 분량이 컨테이너에 딱 맞게 표시. */
const VISIBLE_HOURS = 24;
const CHART_HEIGHT = 260;

/** ISO → "5/17 19:44" 형태 (월/일 시:분). 잘못된 입력이면 빈 문자열. */
function formatTooltipTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${mo}/${da} ${hh}:${mm}`;
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
        <div className="vital-chart__empty">해당 기간에 측정 데이터가 없습니다</div>
      </section>
    );
  }

  // 차트 본문은 별도 컴포넌트로 분리 — 스크롤/측정 관련 hook 들을 활성 탭마다 깔끔히 마운트/언마운트.
  return (
    <ChartBody
      active={active}
      config={config}
      vitals={vitals}
      renderTabs={renderTabs}
      renderCompareBtn={renderCompareBtn}
    />
  );
}

// ============================================================
// ChartBody — 실제 차트 렌더 + 가로 스크롤/툴팁/반올림
// ============================================================

interface ChartBodyProps {
  active: TabKey;
  config: TabConfig;
  vitals: VitalData;
  renderTabs: () => ReactElement;
  renderCompareBtn: () => ReactElement;
}

function ChartBody({
  active,
  config,
  vitals,
  renderTabs,
  renderCompareBtn,
}: ChartBodyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleWidth, setVisibleWidth] = useState(800);

  const isMulti = config.lines.length === 2;
  const isSingle = config.lines.length === 1;
  const isDotsOnly = config.lines.length === 0 && config.dots.length > 0;
  const isCns = active === 'cns';

  const series1 = config.lines[0] ? vitals.series[config.lines[0]] : null;
  const series2 = config.lines[1] ? vitals.series[config.lines[1]] : null;

  const filteredLabs = vitals.labs.filter((l) => config.dots.includes(l.type));

  // vital data 존재 여부 → lab-only 모드 판단
  const vitalHasData =
    (series1?.data.length ?? 0) > 0 || (series2?.data.length ?? 0) > 0;
  const effectiveDotsOnly = !vitalHasData && filteredLabs.length > 0;
  const useDotsOnlyAxis = isDotsOnly || effectiveDotsOnly;

  const axis1 = series1 ? computeAxis(series1, config.dots.length > 0) : null;
  const axis2 = series2 ? computeAxis(series2, false) : null;
  const dotsOnlyAxis = useDotsOnlyAxis
    ? computeDotsOnlyAxis(filteredLabs.map((l) => l.value))
    : null;

  // 라인이 있으면 점은 하단 띠 영역에 배치, vital 라인이 없으면(effectiveDotsOnly)
  // 실제 측정값을 그대로 Y 좌표로 사용
  const dotYFor = (lab: LabDot | undefined): number | null => {
    if (!lab) return null;
    if (axis1 && !effectiveDotsOnly) {
      return axis1.rawMin - axis1.labBand * DOT_INFO[lab.type].bandOffset;
    }
    return lab.value;
  };

  // 모든 시각 수집 (vital 시리즈 + lab dot). lab dot 이 vital 시각과 매칭 안 되도
  // 자기 시각에 그려지도록 union 후 ISO 기준 정렬.
  const timeIso = new Map<string, string>();
  [series1, series2].forEach((s) => {
    if (s) {
      s.times.forEach((t, i) => {
        if (!timeIso.has(t)) timeIso.set(t, s.isoTimes[i] ?? '');
      });
    }
  });
  filteredLabs.forEach((lab) => {
    if (!timeIso.has(lab.time) && lab.isoTime) {
      timeIso.set(lab.time, lab.isoTime);
    }
  });
  const sortedTimes = Array.from(timeIso.entries())
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([t]) => t);

  const findLab = (t: string, type: DotType): LabDot | undefined =>
    config.dots.includes(type)
      ? filteredLabs.find((l) => l.time === t && l.type === type)
      : undefined;

  const chartData = sortedTimes.map((t) => {
    const iso = timeIso.get(t) ?? '';
    const i1 = series1 ? series1.times.indexOf(t) : -1;
    const i2 = series2 ? series2.times.indexOf(t) : -1;
    const v1 = i1 >= 0 ? series1!.data[i1] : null;
    const v2 = i2 >= 0 ? series2!.data[i2] : null;
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
      iso,
      value: v1,
      value2: v2,
      normalBand: axis1 ? axis1.normalHigh - axis1.normalLow : 0,
      normalBase: axis1 ? axis1.normalLow : 0,
      dotOn: isSingle && !isCns && v1 != null && !withinNormal ? v1 : null,
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

  // 좌측 고정 Y축의 도메인/ticks — 현재 탭 + 데이터 유무에 따라 결정.
  let leftAxisDomain: [number, number] | null = null;
  let leftAxisTicks: number[] | undefined;
  if (isMulti && axis1) {
    leftAxisDomain = [axis1.yMin, axis1.yMax];
  } else if (isSingle && !effectiveDotsOnly && single1Domain) {
    leftAxisDomain = single1Domain;
    if (isCns) leftAxisTicks = [3, 6, 9, 12, 15];
  } else if (useDotsOnlyAxis && dotsOnlyAxis) {
    leftAxisDomain = [dotsOnlyAxis.yMin, dotsOnlyAxis.yMax];
  }
  // 스크롤 차트의 hidden YAxis 도메인은 lines/scatter 위치 계산용. effectiveDotsOnly 면 dotsOnlyAxis 사용.
  const hiddenSingleDomain: [number, number] | undefined =
    isSingle && effectiveDotsOnly && dotsOnlyAxis
      ? [dotsOnlyAxis.yMin, dotsOnlyAxis.yMax]
      : single1Domain;

  // 가시영역 폭 측정 — 컨테이너 width 변동 시 chart inner width 도 재계산.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setVisibleWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 데이터 전체 시간 범위 (시간 단위). VISIBLE_HOURS 미만이면 컨테이너에 딱 맞춤.
  const isos = chartData.map((d) => d.iso).filter(Boolean);
  let totalHours = VISIBLE_HOURS;
  if (isos.length >= 2) {
    const min = new Date(isos[0]).getTime();
    const max = new Date(isos[isos.length - 1]).getTime();
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      totalHours = Math.max(VISIBLE_HOURS, (max - min) / 3600000);
    }
  }
  const innerWidth = Math.round((totalHours / VISIBLE_HOURS) * visibleWidth);

  // X축 tick interval — 가시 영역(VISIBLE_HOURS)에 약 VISIBLE_TICK_COUNT 개 라벨이 보이게.
  // recharts XAxis interval=N → 모든 (N+1)번째 데이터마다 1개 라벨 표시 (픽셀 균등).
  const VISIBLE_TICK_COUNT = 6;
  const visibleDataCount = chartData.length * (VISIBLE_HOURS / totalHours);
  const tickInterval = Math.max(
    0,
    Math.round(visibleDataCount / VISIBLE_TICK_COUNT) - 1,
  );

  // 첫 진입/데이터 갱신 시 스크롤을 가장 오른쪽(최신)으로.
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [innerWidth]);

  const renderDotMeta = () =>
    primaryDotType && latestDot ? (
      <span className="vital-chart__current">
        <span className="vital-chart__label">{DOT_INFO[primaryDotType].label}</span>
        <span
          className="vital-chart__value"
          style={{ color: DOT_INFO[primaryDotType].color(latestDot.value) }}
        >
          {Math.round(latestDot.value)}
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
                  {current1 != null ? Math.round(current1) : '—'}
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
                  {current2 != null ? Math.round(current2) : '—'}
                  <span className="vital-chart__unit"> {series2.unit}</span>
                </span>
              </span>
            </>
          ) : isSingle && series1 && axis1 ? (
            <>
              <span className="vital-chart__current">
                <span className="vital-chart__label">{series1.label}</span>
                <span className="vital-chart__value">
                  {current1 != null ? Math.round(current1) : '—'}
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
          <div className="vital-chart__chart-row">
            {/* 좌측 고정 Y축 — ManualYAxis (SVG 직접 렌더, 스크롤 영향 받지 않음) */}
            {leftAxisDomain && (
              <ManualYAxis
                yMin={leftAxisDomain[0]}
                yMax={leftAxisDomain[1]}
                ticks={leftAxisTicks}
                chartHeight={CHART_HEIGHT}
                marginTop={16}
                marginBottom={8 + RECHARTS_XAXIS_HEIGHT}
                orientation="left"
                width={48}
              />
            )}

            {/* 가운데 — 스크롤되는 데이터 + X축 */}
            <div className="vital-chart__scroll" ref={scrollRef}>
              <div style={{ width: innerWidth, height: CHART_HEIGHT }}>
                <ComposedChart
                  width={innerWidth}
                  height={CHART_HEIGHT}
                  data={chartData}
                  margin={{ top: 16, right: 16, bottom: 8, left: 16 }}
                >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  interval={tickInterval}
                />
                {/* YAxis 는 hide — 도메인만 lines/scatter 위치 계산용. 시각 axis 는 좌/우 ManualYAxis 가 담당 */}
                {isMulti && axis1 && axis2 ? (
                  <>
                    <YAxis yAxisId="left" orientation="left" hide domain={[axis1.yMin, axis1.yMax]} />
                    <YAxis yAxisId="right" orientation="right" hide domain={[axis2.yMin, axis2.yMax]} />
                  </>
                ) : isSingle && hiddenSingleDomain ? (
                  <YAxis hide domain={hiddenSingleDomain} />
                ) : useDotsOnlyAxis && dotsOnlyAxis ? (
                  <YAxis hide domain={[dotsOnlyAxis.yMin, dotsOnlyAxis.yMax]} />
                ) : null}
                <Tooltip
                  cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }}
                  content={({ active: tipActive, payload }) => {
                    if (!tipActive || !payload || payload.length === 0) return null;
                    const point = payload[0].payload as {
                      t: string;
                      iso?: string;
                      lacValue?: number | null;
                      creValue?: number | null;
                      pfValue?: number | null;
                      pltValue?: number | null;
                      bilValue?: number | null;
                    };
                    const timeLabel = formatTooltipTime(point.iso) || point.t;

                    const rows: Array<{ label: string; value: string }> = [];
                    const seen = new Set<string>();
                    for (const entry of payload) {
                      const name = String(entry.name);
                      if (seen.has(name)) continue;
                      seen.add(name);
                      const v = entry.value;
                      if (v == null) continue;
                      if (name === 'value' && series1) {
                        rows.push({
                          label: series1.label,
                          value: `${Math.round(Number(v))} ${series1.unit}`,
                        });
                      } else if (name === 'value2' && series2) {
                        rows.push({
                          label: series2.label,
                          value: `${Math.round(Number(v))} ${series2.unit}`,
                        });
                      } else if (name === 'lacY' && point.lacValue != null) {
                        rows.push({
                          label: DOT_INFO.lac.label,
                          value: `${Math.round(point.lacValue)} ${DOT_INFO.lac.unit}`,
                        });
                      } else if (name === 'creY' && point.creValue != null) {
                        rows.push({
                          label: DOT_INFO.cre.label,
                          value: `${Math.round(point.creValue)} ${DOT_INFO.cre.unit}`,
                        });
                      } else if (name === 'pfY' && point.pfValue != null) {
                        rows.push({
                          label: DOT_INFO.pf_ratio.label,
                          value: `${Math.round(point.pfValue)}`,
                        });
                      } else if (name === 'pltY' && point.pltValue != null) {
                        rows.push({
                          label: DOT_INFO.platelet.label,
                          value: `${Math.round(point.pltValue)} ${DOT_INFO.platelet.unit}`,
                        });
                      } else if (name === 'bilY' && point.bilValue != null) {
                        rows.push({
                          label: DOT_INFO.bilirubin.label,
                          value: `${Math.round(point.bilValue)} ${DOT_INFO.bilirubin.unit}`,
                        });
                      }
                      // skip: normalBase, normalBand, dotOn — 차트 보조 dataKey
                    }
                    if (rows.length === 0) return null;

                    return (
                      <div className="vital-chart__tooltip">
                        <div className="vital-chart__tooltip-time">{timeLabel}</div>
                        <ul className="vital-chart__tooltip-list">
                          {rows.map((r, i) => (
                            <li key={i} className="vital-chart__tooltip-row">
                              <span className="vital-chart__tooltip-label">{r.label}</span>
                              <span className="vital-chart__tooltip-value">{r.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
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
                      connectNulls
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
                      connectNulls
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
                      connectNulls
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
            </div>
          </div>

            {/* 우측 고정 Y축 — multi 탭 (Cardio: MAP / HR) */}
            {isMulti && axis2 && (
              <ManualYAxis
                yMin={axis2.yMin}
                yMax={axis2.yMax}
                chartHeight={CHART_HEIGHT}
                marginTop={16}
                marginBottom={8 + RECHARTS_XAXIS_HEIGHT}
                orientation="right"
                width={48}
              />
            )}
          </div>
        ) : (
          <div className="vital-chart__empty">해당 기간에 측정 데이터가 없습니다</div>
        )}
      </div>
    </section>
  );
}
