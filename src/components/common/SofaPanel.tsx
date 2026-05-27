// 실제 MIMIC-IV 데이터에서는 장기별 결측 패턴이 다름
// cardiovascular은 거의 매시간, respiration/coagulation/liver는 하루 1~2회 수준
// 결측 보간 없이 실제 측정값만 표시. connectNulls={false} 유지.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSofaTrend } from '../../api/services/sofaService';
import { useAsync } from '../../hooks/useAsync';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import { useTheme } from '../../hooks/useTheme';
import type { OrganKey, SofaTrend } from '../../types';
import bodyDarkUrl from '../../assets/images/anatomy/body-silhouette-dark.png';
import bodyLightUrl from '../../assets/images/anatomy/body-silhouette-light.png';
import SofaBodySvg from './sofa/SofaBodySvg';
import { ORGANS, ORGAN_KEYS } from './sofa/sofaConfig';
import ManualYAxis, { RECHARTS_XAXIS_HEIGHT } from './charts/ManualYAxis';
import './SofaPanel.css';

interface SofaPanelProps {
  patientId: string;
}

/** 첫 진입 시 가시영역에 보일 시간 폭 (시간 단위). */
const VISIBLE_HOURS = 24;
/**
 * SOFA 차트 자체 높이 (px). recharts Legend 가 차트 SVG 하단에 ~24px 점유하므로
 * 컨테이너 260px 안에 chart + legend 가 모두 들어가도록 240 으로 설정.
 * (260 - 240 = 20px 여유 — sofa-chart__row 의 align-items:center 로 10px 위/아래 분배)
 * plot area = 240 - margin.top(12) - margin.bottom(8) - XAxis(30) - Legend(24) ≈ 166px.
 */
const CHART_HEIGHT = 240;

/** null/NaN을 모두 결측으로 간주해 유효 값이 1개 이상인지 검사 */
function hasValidData(scores: Array<number | null>): boolean {
  return scores.some((v) => v != null && !Number.isNaN(v));
}

/** 가장 마지막 유효 값 반환. 모두 결측이면 null. */
function findLatestValid(scores: Array<number | null>): number | null {
  for (let i = scores.length - 1; i >= 0; i--) {
    const v = scores[i];
    if (v != null && !Number.isNaN(v)) return v;
  }
  return null;
}

/** ISO → "5/17 19:44" 형태. 잘못된 입력이면 빈 문자열. */
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

const ORGAN_LEGEND_LABEL: Record<OrganKey, string> = {
  cardiovascular: '심혈관',
  respiration: '호흡기',
  cns: 'CNS',
  liver: '간',
  renal: '신장',
  coagulation: '응고계',
};

const EMPTY_TREND: SofaTrend = {
  times: [],
  isoTimes: [],
  scores: {
    cardiovascular: [], respiration: [], cns: [], liver: [], renal: [], coagulation: [],
  },
};

export default function SofaPanel({ patientId }: SofaPanelProps) {
  const { data: trendData, loading, error, refetch } = useAsync(
    () => getSofaTrend(patientId),
    [patientId],
  );
  const trend: SofaTrend = trendData ?? EMPTY_TREND;
  const theme = useTheme();
  const [selected, setSelected] = useState<OrganKey | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleWidth, setVisibleWidth] = useState(800);

  const silhouetteSrc = theme === 'light' ? bodyLightUrl : bodyDarkUrl;

  const chartData = useMemo(
    () =>
      trend.times.map((t, i) => ({
        t,
        iso: trend.isoTimes[i] ?? '',
        cardiovascular: trend.scores.cardiovascular[i],
        respiration: trend.scores.respiration[i],
        cns: trend.scores.cns[i],
        liver: trend.scores.liver[i],
        renal: trend.scores.renal[i],
        coagulation: trend.scores.coagulation[i],
      })),
    [trend],
  );

  const latestScores = ORGAN_KEYS.reduce<Record<OrganKey, number | null>>(
    (acc, key) => {
      acc[key] = findLatestValid(trend.scores[key]);
      return acc;
    },
    {
      cardiovascular: null,
      respiration: null,
      cns: null,
      liver: null,
      renal: null,
      coagulation: null,
    },
  );

  const selectedHasNoData =
    selected !== null && !hasValidData(trend.scores[selected]);

  // 데이터 자체가 비었는지 (모든 organ 결측 또는 trend 시점 0개)
  const trendIsEmpty =
    chartData.length === 0 ||
    ORGAN_KEYS.every((k) => !hasValidData(trend.scores[k]));

  // 가시영역 폭 측정
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

  // 데이터 전체 시간 범위
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
  const VISIBLE_TICK_COUNT = 6;
  const visibleDataCount = chartData.length * (VISIBLE_HOURS / totalHours);
  const tickInterval = Math.max(
    0,
    Math.round(visibleDataCount / VISIBLE_TICK_COUNT) - 1,
  );

  // 첫 진입 + 데이터 갱신 시 가장 오른쪽(최신)으로 스크롤.
  // 사용자가 수동 스크롤 중일 때는 발화하지 않음 — chartData/innerWidth 변경 시에만.
  // recharts SVG가 완전히 레이아웃된 뒤에 scrollWidth를 읽기 위해 rAF 1프레임 지연.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(raf);
  }, [innerWidth, chartData]);

  const handleOrganClick = (key: OrganKey) => {
    setSelected((prev) => (prev === key ? null : key));
  };

  if (loading) {
    return (
      <div className="sofa-panel">
        <LoadingState />
      </div>
    );
  }
  if (error) {
    return (
      <div className="sofa-panel">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="sofa-panel">
      <SofaBodySvg
        silhouetteSrc={silhouetteSrc}
        selected={selected}
        latestScores={latestScores}
        onOrganClick={handleOrganClick}
      />

      <div className="sofa-chart">
        {trendIsEmpty ? (
          <div className="sofa-chart__empty" role="status">
            해당 기간에 측정 데이터가 없습니다
          </div>
        ) : (
          <>
            <div className="sofa-chart__row">
              {/* 좌측 고정 Y축 — 0~4 SOFA 점수 (ManualYAxis, SVG 직접 렌더) */}
              <ManualYAxis
                yMin={0}
                yMax={4}
                ticks={[0, 1, 2, 3, 4]}
                chartHeight={CHART_HEIGHT}
                marginTop={12}
                marginBottom={8 + RECHARTS_XAXIS_HEIGHT}
                orientation="left"
                width={36}
              />

              {/* 가운데 스크롤 데이터 + X축 */}
              <div className="sofa-chart__scroll" ref={scrollRef}>
                <div style={{ width: innerWidth, height: CHART_HEIGHT, flexShrink: 0 }}>
                  <LineChart
                    width={innerWidth}
                    height={CHART_HEIGHT}
                    data={chartData}
                    margin={{ top: 12, right: 16, bottom: 8, left: 16 }}
                  >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    stroke="var(--border)"
                    interval={tickInterval}
                  />
                  {/* hide — 도메인만 라인 계산용으로 유지 */}
                  <YAxis hide domain={[0, 4]} />
                  <Tooltip
                    cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }}
                    content={({ active: tipActive, payload }) => {
                      if (!tipActive || !payload || payload.length === 0) return null;
                      const point = payload[0].payload as { t: string; iso?: string };
                      const timeLabel = formatTooltipTime(point.iso) || point.t;

                      const rows: Array<{ label: string; value: string }> = [];
                      for (const entry of payload) {
                        const v = entry.value;
                        if (v == null) continue;
                        const name = String(entry.name);
                        const label = ORGAN_LEGEND_LABEL[name as OrganKey] ?? name;
                        rows.push({ label, value: `${v}점` });
                      }
                      if (rows.length === 0) return null;

                      return (
                        <div className="sofa-chart__tooltip">
                          <div className="sofa-chart__tooltip-time">{timeLabel}</div>
                          <ul className="sofa-chart__tooltip-list">
                            {rows.map((r, i) => (
                              <li key={i} className="sofa-chart__tooltip-row">
                                <span className="sofa-chart__tooltip-label">{r.label}</span>
                                <span className="sofa-chart__tooltip-value">{r.value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                    formatter={(value) =>
                      ORGAN_LEGEND_LABEL[value as OrganKey] ?? String(value)
                    }
                  />
                  {ORGANS.map((o) => {
                    const isFocused = selected === o.key;
                    const dimmed = selected !== null && !isFocused;
                    return (
                      <Line
                        key={o.key}
                        type="monotone"
                        dataKey={o.key}
                        name={o.key}
                        stroke={o.color}
                        strokeWidth={isFocused ? 3 : 2}
                        strokeOpacity={dimmed ? 0.2 : 1}
                        dot={{ r: 3, fill: o.color, strokeOpacity: dimmed ? 0.2 : 1 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </LineChart>
              </div>
            </div>
            </div>
            {selectedHasNoData && selected !== null && (
              <div className="sofa-chart__empty" role="status">
                최근 24시간 내 {ORGAN_LEGEND_LABEL[selected]} 측정 데이터가 없습니다
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
