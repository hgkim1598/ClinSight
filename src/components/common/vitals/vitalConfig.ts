import type { LabDot, TabKey, VitalKey } from '../../../types';

export type DotType = LabDot['type'];

export interface TabConfig {
  lines: VitalKey[];
  dots: DotType[];
  yAxisLabel?: string;
}

export const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'sofa', label: 'SOFA' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'resp', label: 'Resp' },
  { key: 'renal', label: 'Renal' },
  { key: 'cns', label: 'CNS' },
  { key: 'coag', label: 'Coag' },
  { key: 'hepatic', label: 'Hepatic' },
  { key: 'temp', label: 'Temp' },
];

export const TAB_CONFIG: Record<TabKey, TabConfig | null> = {
  sofa: null,
  cardio: { lines: ['map', 'hr'], dots: ['lac'], yAxisLabel: 'mmHg / bpm' },
  resp: { lines: ['spo2', 'rr'], dots: ['pf_ratio'], yAxisLabel: '% / /min' },
  renal: { lines: ['urine_output'], dots: ['cre'], yAxisLabel: 'mL/h' },
  cns: { lines: ['gcs'], dots: [], yAxisLabel: '' },
  coag: { lines: [], dots: ['platelet'], yAxisLabel: '×10³/μL' },
  hepatic: { lines: [], dots: ['bilirubin'], yAxisLabel: 'mg/dL' },
  temp: { lines: ['temp'], dots: [], yAxisLabel: '°C' },
};

export const CRE_DANGER_THRESHOLD = 2.0;

export interface DotInfo {
  label: string;
  unit: string;
  /** 임계치 기반 색상 분기 */
  color: (v: number) => string;
  /** 라인이 있을 때 하단 띠 안에서의 위치 (0=상단, 1=하단) */
  bandOffset: number;
}

/**
 * 비교 모드 라인 색상 — 다크 배경(--canvas) 대비 확보용.
 * tokens.css 에 없는 vital 전용 색상 팔레트라 vitalConfig 내 상수로 둔다.
 */
export const VITAL_COMPARE_COLORS: Record<VitalKey, string> = {
  hr: '#ef4444',
  map: '#3b82f6',
  spo2: '#22c55e',
  rr: '#f59e0b',
  temp: '#a855f7',
  gcs: '#06b6d4',
  urine_output: '#64748b',
};

/** Y 축에 표시할 vital 이름 + 단위 라벨. */
export const VITAL_AXIS_LABEL: Record<VitalKey, string> = {
  hr: 'HR (bpm)',
  map: 'MAP (mmHg)',
  spo2: 'SpO₂ (%)',
  rr: 'RR (/min)',
  temp: 'Temp (°C)',
  gcs: 'GCS',
  urine_output: 'Urine (mL/h)',
};

/**
 * 수치 표시 규칙.
 *  - temp: 소수 1자리
 *  - spo2: 정수, 100 고정 상한
 *  - 그 외: 정수
 */
export function formatVitalValue(key: VitalKey, value: number): string {
  if (key === 'temp') return value.toFixed(1);
  if (key === 'spo2') return String(Math.min(100, Math.round(value)));
  return String(Math.round(value));
}

/** 비교 모드 최대 선택 탭 수 (2탭 × 탭당 최대 2 lines = 최대 4 lines → Y축 4개로 자연 수용). */
export const COMPARE_MAX_TABS = 2;

/** 비교 모드에서 선택 불가한 탭. sofa(별도 컴포넌트), coag/hepatic(line 없음). */
export const COMPARE_DISABLED_TABS: TabKey[] = ['sofa', 'coag', 'hepatic'];

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
