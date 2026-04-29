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
