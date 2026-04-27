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

/** AI 설명 모달이 다루는 섹션 키 */
export type AiInsightSection = 'trend' | 'shap' | 'rawMetrics' | 'auxiliary';

/** 채팅 패널 컨텍스트 — 섹션 단위 또는 환자 전체 */
export type ChatContext =
  | { type: 'section'; section: AiInsightSection; modelKey: ModelKey }
  | { type: 'patient'; patientId: string };

/** 채팅 메시지 한 건 */
export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

// ---------- 환자 요약 보고서 ----------

/** 활력징후 상태 등급 */
export type VitalStatusLevel = 'normal' | 'attention' | 'critical';

/** 보고서 활력징후 행 */
export interface ReportVitalRow {
  key: VitalKey;
  label: string;
  unit: string;
  latestValue: number | null;
  latestTime: string | null;
  normalRange: [number, number];
  status: VitalStatusLevel;
}

/** 보고서 검사 결과 행 */
export interface ReportLabRow {
  label: string;
  value: string;
  unit: string;
  time: string;
  normalRange: string;
}

/** 보고서 예측 결과 행 */
export interface ReportPrediction {
  key: ModelKey;
  title: string;
  probability: number;
  risk: RiskLevel;
}

/** 환자 상태 요약 보고서 — patient + vitals + labs + predictions 조합 */
export interface PatientReport {
  patient: Patient;
  generatedAt: Date;
  vitals: ReportVitalRow[];
  labs: ReportLabRow[];
  predictions: ReportPrediction[];
}

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

/** 보조지표 — 치료 에스컬레이션 예측 (ARDS/Shock 전용) */
export interface EscalationPrediction {
  title: string;
  shortLabel: string;
  probability: number;
  currentStatus: 'unused' | 'inUse';
  shap: ShapFeature[];
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
  escalation?: EscalationPrediction;
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

// ---------- SOFA ----------

/** SOFA 6개 장기 시스템 */
export type OrganKey = 'cardio' | 'resp' | 'cns' | 'hepatic' | 'renal' | 'coag';

/** SOFA 점수 추이 — 6개 장기가 동일 시간축 공유.
 *  실제 데이터는 결측이 잦아 각 시점은 number 또는 null. NaN도 동일하게 결측으로 간주한다.
 */
export interface SofaTrend {
  times: string[];
  scores: Record<OrganKey, Array<number | null>>;
}

/** 환자 1명 바이탈 + lab 번들 */
export interface VitalData {
  series: Record<VitalKey, VitalSeries>;
  labs: LabDot[];
}

// ---------- ICU 운영 / Staffing ----------

/**
 * 의사 활동 종류별 인원.
 * label은 향후 enum code(예: 'ROUNDS', 'SURGERY')로 이행 가능하며,
 * 현재는 표시 라벨을 그대로 사용한다. 합계는 DoctorRoster.onDuty 이하이다.
 */
export interface DoctorActivityCount {
  /** 활동 라벨 (예: '회진', '수술', '응급', '회의') */
  label: string;
  /** 해당 활동 중인 의사 수 */
  count: number;
}

/** ICU 의사 인력 스냅샷 */
export interface DoctorRoster {
  /** 현재 근무 중 의사 수 */
  onDuty: number;
  /** 등록된 의사 총원 */
  total: number;
  /** 활동 분포 (각 항목 count 합 ≤ onDuty) */
  activities: DoctorActivityCount[];
}

/** ICU 간호사 인력 스냅샷 */
export interface NurseRoster {
  /** 현재 근무 중 간호사 수 */
  onDuty: number;
}

/** 운영 임계값 (정책 기반, 환경별로 상이) */
export interface StaffingThresholds {
  /**
   * 간호사 1명이 담당 가능한 최대 환자 수.
   * (환자 수 / 간호사 수) ≤ 이 값 이면 '권장 수준', 초과면 '주의'.
   */
  maxPatientsPerNurse: number;
}

/**
 * ICU 운영 스냅샷 — 병상 정원, 의사·간호사 인력 현황, 운영 임계값.
 *
 * Backend 매핑 (DynamoDB):
 *   - Table: `IcuStaffing`
 *   - PK: `icuId` (S)
 *   - 그 외 필드는 객체/맵 속성으로 저장
 *
 * Lambda API:
 *   - GET /icus/{icuId}/staffing → StaffingSnapshot
 *   - 단일 ICU의 가장 최신 스냅샷을 반환
 */
export interface StaffingSnapshot {
  /** ICU 식별자 (DynamoDB PK) */
  icuId: string;
  /** 스냅샷 갱신 시각 (ISO 8601, 타임존 포함) */
  updatedAt: string;
  /** 병상 정원 (현재 가동 가능한 침상 수) */
  totalBeds: number;
  /** 의사 인력 현황 */
  doctors: DoctorRoster;
  /** 간호사 인력 현황 */
  nurses: NurseRoster;
  /** 운영 임계값 (간호사:환자 비율 등) */
  thresholds: StaffingThresholds;
}