import type { VitalSeries } from '../../../types';

export interface AxisRange {
  yMin: number;
  yMax: number;
  rawMin: number;
  labBand: number;
  normalLow: number;
  normalHigh: number;
}

/**
 * 시리즈 데이터 + 정상범위로부터 Y축 도메인을 계산.
 * withLabBand=true이면 하단에 lab 점 마커용 띠(labBand)를 확보한다.
 */
export function computeAxis(series: VitalSeries, withLabBand: boolean): AxisRange {
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

/**
 * 라인 시리즈가 없는 dots-only 탭의 Y축 도메인. 점 값들의 min/max에서 ±30% 패딩.
 */
export function computeDotsOnlyAxis(values: number[]): AxisRange {
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
