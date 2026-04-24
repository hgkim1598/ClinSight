// ============================================
// ClinSight 타입 정의
// ============================================

// ---------- 공통 ----------

/** 위험도 등급 (v2: HIGH ≥60%, MED 30~60%, LOW <30%) */
export type RiskLevel = 'high' | 'med' | 'low';

/** 환자 상태 */
export type PatientStatus = '집중관찰' | '안정' | '주의관찰';

/** 모델 종류 (5개) */
export type ModelKey = 'mortality' | 'aki' | 'ards' | 'sic' | 'shock';

/** 모델 위험 톤 */
export type RiskTone = 'danger' | 'warn' | 'safe';

// ---------- 환자 ----------

export interface Patient {
  bed: string;
  id: string;
  name: string;
  age: number;
  sex: 'M' | 'F';
  admit: string;
  diag: string;
  risk: RiskLevel;
  status: PatientStatus;
  sofa: number;
  sepsisOnset?: string;
}

// ---------- 모델 예측 ----------

/** 확률 추이 데이터 포인트 */
export interface TrendPoint {
  t: string;
  pct: number;
}

/** 추세 경고 */
export interface TrendWarning {
  delta: string;
  note: string;
}

/** SHAP 피처 기여도 */
export interface ShapFeature {
  name: string;
  value: number;
  direction: 'up' | 'down';
}

/** Raw 임상 지표 */
export interface RawMetric {
  label: string;
  value: string;
  unit: string;
  time: string;
  isModelInput: boolean;
}

/** 개별 모델 예측 결과 */
export interface ModelPrediction {
  title: string;
  tone: RiskTone;
  trend: TrendPoint[];
  trendWarn: TrendWarning;
  shap: ShapFeature[];
  raw: RawMetric[];
  llmSummary: string;
}

// ---------- ICU 현황 ----------

/** KPI 카드 데이터 */
export interface KpiData {
  label: string;
  value: string | number;
  sub: string;
  tone?: RiskTone | 'default';
  icon?: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
}

// ---------- Vital Signs ----------

/** 바이탈 시계열 데이터 */
export interface VitalSeries {
  label: string;
  unit: string;
  data: number[];
  normal: [number, number];
  times: string[];
}

/** 검사 수치 (Lac, Cre 등 annotation용) */
export interface LabDot {
  time: string;
  label: string;
  value: number;
}

/** 바이탈 차트 탭 키 */
export type VitalKey = 'hr' | 'map' | 'spo2' | 'rr' | 'temp';

/** 환자 1명 바이탈 + lab 번들 */
export interface VitalData {
  series: Record<VitalKey, VitalSeries>;
  labs: LabDot[];
}