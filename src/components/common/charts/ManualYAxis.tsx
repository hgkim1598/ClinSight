import type { CSSProperties } from 'react';
import './ManualYAxis.css';

/**
 * recharts XAxis 기본 height. 차트 하단에서 차지하는 공간.
 * 가로 스크롤 차트와 ManualYAxis 의 plot area 정렬에 사용.
 */
export const RECHARTS_XAXIS_HEIGHT = 30;

interface ManualYAxisProps {
  yMin: number;
  yMax: number;
  /** 명시 ticks. 없으면 5개 균등 분할 (yMin/yMax 포함). */
  ticks?: number[];
  /** 차트 전체 높이 — 스크롤 차트와 동일해야 함. */
  chartHeight: number;
  /** 위 margin — 스크롤 차트의 margin.top 과 동일. */
  marginTop: number;
  /** 아래 margin — 스크롤 차트의 margin.bottom + RECHARTS_XAXIS_HEIGHT. */
  marginBottom: number;
  orientation: 'left' | 'right';
  width: number;
  formatTick?: (v: number) => string;
  /** 축 옆 세로 라벨 (예: "HR (bpm)"). 미지정이면 라벨 없음. */
  label?: string;
  /** 라벨 색상 — 해당 라인 색상과 일치시켜 축↔라인 매핑이 즉시 보이게. */
  labelColor?: string;
  style?: CSSProperties;
}

function defaultTicks(yMin: number, yMax: number): number[] {
  if (yMin === yMax) return [yMin];
  const step = (yMax - yMin) / 4;
  return [yMin, yMin + step, yMin + 2 * step, yMin + 3 * step, yMax];
}

/**
 * SVG 로 직접 그리는 Y 축. recharts 의존 없음.
 * 스크롤되는 차트 옆에 고정 배치해 Y 축이 스크롤되지 않도록 한다.
 *
 * 정렬 정책:
 * - 스크롤 차트의 plot area top = marginTop
 * - 스크롤 차트의 plot area bottom = chartHeight - marginBottom (이 marginBottom 은 차트 margin + XAxis height 합산)
 * - tick y 위치 = plotBottom - ((tick - yMin) / (yMax - yMin)) * plotHeight
 */
export default function ManualYAxis({
  yMin,
  yMax,
  ticks,
  chartHeight,
  marginTop,
  marginBottom,
  orientation,
  width,
  formatTick = (v) => `${Math.round(v)}`,
  label,
  labelColor,
  style,
}: ManualYAxisProps) {
  const plotTop = marginTop;
  const plotBottom = chartHeight - marginBottom;
  const plotHeight = Math.max(0, plotBottom - plotTop);
  const range = yMax - yMin;

  // 데이터가 비정상(NaN/Infinity)이면 축 선만 그리고 ticks 는 생략.
  const domainValid = Number.isFinite(yMin) && Number.isFinite(yMax);
  const tickValues = domainValid ? (ticks ?? defaultTicks(yMin, yMax)) : [];

  const isLeft = orientation === 'left';
  // 좌측 축: axis line 이 width 의 오른쪽 끝. 라벨은 왼쪽 정렬.
  // 우측 축: axis line 이 width 의 왼쪽 끝. 라벨은 오른쪽 정렬.
  const axisX = isLeft ? width - 0.5 : 0.5;
  const tickStartX = isLeft ? width - 4 : 0;
  const tickEndX = isLeft ? width : 4;
  const labelX = isLeft ? width - 6 : 6;
  const labelAnchor: 'start' | 'end' = isLeft ? 'end' : 'start';

  return (
    <svg
      width={width}
      height={chartHeight}
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <line
        x1={axisX}
        x2={axisX}
        y1={plotTop}
        y2={plotBottom}
        stroke="var(--border)"
      />
      {label && (() => {
        const labelX = isLeft ? 14 : width - 14;
        const labelY = (plotTop + plotBottom) / 2;
        return (
          <text
            x={labelX}
            y={labelY}
            transform={`rotate(-90, ${labelX}, ${labelY})`}
            fill={labelColor ?? 'var(--text-secondary)'}
            textAnchor="middle"
            className="manual-y-axis__label"
          >
            {label}
          </text>
        );
      })()}
      {tickValues.map((tick) => {
        const ratio = range === 0 ? 0 : (tick - yMin) / range;
        const y = plotBottom - ratio * plotHeight;
        return (
          <g key={tick}>
            <line
              x1={tickStartX}
              x2={tickEndX}
              y1={y}
              y2={y}
              stroke="var(--border)"
            />
            <text
              x={labelX}
              y={y}
              dy={3.5}
              fill="var(--text-muted)"
              fontSize={11}
              textAnchor={labelAnchor}
            >
              {formatTick(tick)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
