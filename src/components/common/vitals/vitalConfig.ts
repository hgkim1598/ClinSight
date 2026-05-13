import type { LabDot, TabKey, VitalKey } from '../../../types';

export type DotType = LabDot['type'];

export interface TabConfig {
  lines: VitalKey[];
  dots: DotType[];
  yAxisLabel?: string;
}

export const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'sofa', label: 'SOFA' },
  { key: 'vs', label: 'V/S' },
  { key: 'io', label: 'I/O' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'resp', label: 'Resp' },
  { key: 'renal', label: 'Renal' },
  { key: 'cns', label: 'CNS' },
  { key: 'coag', label: 'Coag' },
  { key: 'hepatic', label: 'Hepatic' },
  { key: 'temp', label: 'Temp' },
];

/**
 * 표준 TAB_CONFIG. 1-line / 2-line / dots-only 케이스만 다룬다.
 * sofa, vs 는 다중 차트 구성이라 별도 렌더 경로를 사용 (`null`).
 */
export const TAB_CONFIG: Record<TabKey, TabConfig | null> = {
  sofa: null,
  vs: null,
  // I/O — Intake/Output 2-line (피드백 §4-3)
  io: { lines: ['intake_volume', 'urine_output'], dots: [], yAxisLabel: 'mL/h' },
  cardio: { lines: ['map', 'hr'], dots: ['lac'], yAxisLabel: 'mmHg / bpm' },
  resp: { lines: ['spo2', 'rr'], dots: ['pf_ratio'], yAxisLabel: '% / /min' },
  renal: { lines: ['urine_output'], dots: ['cre'], yAxisLabel: 'mL/h' },
  cns: { lines: ['gcs'], dots: [], yAxisLabel: '' },
  coag: { lines: [], dots: ['platelet'], yAxisLabel: '×10³/μL' },
  hepatic: { lines: [], dots: ['bilirubin'], yAxisLabel: 'mg/dL' },
  temp: { lines: ['temp'], dots: [], yAxisLabel: '°C' },
};

/**
 * V/S 탭 구성: 임상에서 한 세트로 함께 보는 5개 지표를 3개 차트로 묶음.
 *  - 차트 1 (혈역학): Dual Y-axis — 왼쪽 MAP(mmHg), 오른쪽 HR(bpm)
 *  - 차트 2 (호흡): Dual Y-axis — 왼쪽 SpO₂(%), 오른쪽 RR(회/분)
 *  - 차트 3 (체온): 단일 — Temperature(°C)
 * 가로 배치(grid)로 노출. 세로 스택은 사용하지 않음 (피드백 §2-1, §6-2).
 */
export const VS_PANEL_CONFIGS: Array<
  | { kind: 'dual'; title: string; leftKey: VitalKey; rightKey: VitalKey }
  | { kind: 'single'; title: string; key: VitalKey }
> = [
  { kind: 'dual', title: '혈역학 (MAP / HR)', leftKey: 'map', rightKey: 'hr' },
  { kind: 'dual', title: '호흡 (SpO₂ / RR)', leftKey: 'spo2', rightKey: 'rr' },
  { kind: 'single', title: '체온', key: 'temp' },
];

export const CRE_DANGER_THRESHOLD = 2.0;

export interface DotInfo {
  label: string;
  unit: string;
  /** 임계치 기반 색상 분기 */
  color: (v: number) => string;
  /** 라인이 있을 때 하단 띠 안에서의 위치 (0=상단, 1=하단) */
  bandOffset: number;
}

export const DOT_INFO: Record<DotType, DotInfo> = {
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
    color: (v) =>
      v >= 150 ? 'var(--safe)' : v >= 100 ? 'var(--warn)' : 'var(--danger)',
    bandOffset: 0.5,
  },
  bilirubin: {
    label: 'Bilirubin',
    unit: 'mg/dL',
    color: (v) =>
      v < 1.2 ? 'var(--safe)' : v < 6.0 ? 'var(--warn)' : 'var(--danger)',
    bandOffset: 0.5,
  },
};
