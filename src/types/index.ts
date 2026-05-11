// ============================================
// ClinSight 타입 정의 (V4 API 명세 기반)
// ============================================
//
// 설계 원칙:
// - API 응답(snake_case)을 그대로 옮긴 "wire type"은 별도 식별을 위해
//   접미사 없이 명세의 객체명을 그대로 따른다 (예: DashboardPatient).
// - 컴포넌트가 소비하는 view-model 타입은 camelCase 필드로 변환된 상태.
// - service 레이어가 wire → view-model 변환을 책임진다.
// - PHI(환자 실명) 필드는 API에 없으므로 view-model에도 두지 않는다.
//   화면 표시 시 formatPatientName(patient_token)으로 별도 해석한다.
//
// 참고: docs/CLINSIGHT_V4_API_SPEC.md

// ---------- 공통 ----------

/** 위험도 라벨 — API와 통일된 값 (medium, med 아님) */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 모델 카드 UI 색상 톤. RiskLevel에서 컴포넌트 단에서 매핑한다. */
export type RiskTone = 'danger' | 'warn' | 'safe';

/**
 * 모델 카드 UI에서 다루는 5개 메인 모델의 target_name.
 * UI는 target_name으로 그룹핑한다.
 */
export type TargetName = 'mortality' | 'aki' | 'ards' | 'sic' | 'shock';

/**
 * 보조지표 모델 target_name.
 * ARDS 카드에 invasive_vent, Shock 카드에 vasopressor를 묶어 표시한다.
 */
export type EscalationTarget = 'invasive_vent' | 'vasopressor';

/**
 * API의 `model_key` 값 — `target_name + horizon`을 합친 형태.
 * `/predictions/{modelKey}` 등 API path에 들어가는 식별자.
 */
export type ApiModelKey =
  | 'mortality_48h'
  | 'aki_48h'
  | 'ards_24h'
  | 'sic_24h'
  | 'septic_shock_12h'
  | 'invasive_vent_12h'
  | 'vasopressor_12h';

/**
 * 이전 코드와의 호환을 위해 `ModelKey` alias 유지 = `TargetName`.
 * UI 그룹핑 키. 새 코드는 직접 `TargetName`을 사용 권장.
 * API path에는 `ApiModelKey`를 사용한다.
 */
export type ModelKey = TargetName;

/** AI 설명 모달이 다루는 섹션 키 */
export type AiInsightSection = 'trend' | 'shap' | 'rawMetrics' | 'auxiliary';

/** 채팅 패널 컨텍스트 */
export type ChatContext =
  | { type: 'section'; section: AiInsightSection; modelKey: TargetName }
  | { type: 'patient'; stayToken: string };

/** 채팅 메시지 한 건 */
export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

// ---------- /me ----------

export interface Me {
  staffId: string;
  cognitoSub: string;
  displayName: string;
  role: string;
  primaryDepartmentCode: string;
  rolesJsonb: string[];
  status: string;
  lastLoginAt: string;
}

// ---------- /meta ----------

export interface Metric {
  configKey: string;
  displayName: string;
  metricGroup: 'vital' | 'lab' | 'derived' | 'sofa';
  unit: string;
  normalRangeLow: number | null;
  normalRangeHigh: number | null;
  sortOrder: number;
}

export interface ModelMeta {
  modelKey: string;
  modelVersion: string;
  modelName: string;
  modelType: string;
  targetName: string;
  horizonHours: number;
  endpointType: string;
  defaultThreshold: number;
  /** RawMetric의 'Model input' / 'Display only' 라벨 산출 근거. metric_code 배열. */
  inputFeatures: string[];
}

// ---------- 환자 (Dashboard / Detail) ----------

/**
 * 대시보드 행 (GET /dashboard/icu/{icuId} 응답의 patients[i]).
 * 환자 목록 테이블/KPI에 사용. 환자 상세 진입 전 경량 페이로드.
 */
export interface DashboardPatient {
  stayId: string;
  stayToken: string;
  patientToken: string;
  currentBedLabel: string;
  ageGroup: string;
  sex: 'M' | 'F';
  latestMortalityRiskScore: number;
  latestMortalityRiskLabel: RiskLevel;
  latestComplicationRiskScore: number;
  latestSofaTotal: number;
  activeAlertCount: number;
  lastPredictionAt: string;
  lastObservationAt: string;
}

export interface IcuUnitInfo {
  unitCode: string;
  displayName: string;
}

export interface DashboardSummary {
  totalPatients: number;
  highRiskCount: number;
  criticalAlertCount: number;
}

export interface DashboardResponse {
  icuUnit: IcuUnitInfo;
  patients: DashboardPatient[];
  summary: DashboardSummary;
}

/**
 * 환자 상세 헤더 (GET /icu-stays/{stayId} 응답).
 * 진단·입실 시각·sepsis onset 등 상세 필드 포함.
 */
export interface PatientDetail {
  stayId: string;
  stayToken: string;
  patientToken: string;
  ageYears: number;
  ageGroup: string;
  sex: 'M' | 'F';
  admissionType: string;
  primaryDiagnosisCode: string;
  primaryDiagnosisText: string;
  hospitalAdmitAt: string;
  icuInAt: string;
  icuOutAt: string | null;
  currentUnitCode: string;
  currentBedLabel: string;
  status: string;
  sepsisOnsetAt: string | null;
}

// ---------- /dashboard staffing (Phase 3 — 현재 미사용) ----------

export interface AssignedStaff {
  staffId: string;
  displayName: string;
  role: string;
}

export interface PatientAssignment {
  stayToken: string;
  patientToken: string;
  currentBedLabel: string;
  assignedStaff: AssignedStaff[];
}

export interface DashboardStaffing {
  icuUnitCode: string;
  assignments: PatientAssignment[];
  summary: {
    totalPatients: number;
    myPatientsCount: number;
    unassignedCount: number;
  };
}

// ---------- Clinical Observations (wire) ----------

/** /clinical-data 응답의 observations[i] — flat row */
export interface ClinicalObservation {
  observationId: string;
  metricGroup: 'vital' | 'lab' | 'derived';
  /** API metric_code. 풀네임 사용 (lactate, creatinine, pao2_fio2 등). */
  metricCode: string;
  metricName: string;
  numericValue: number;
  unit: string;
  valueStatus: 'normal' | 'low' | 'high' | 'abnormal' | string;
  normalRangeLow: number | null;
  normalRangeHigh: number | null;
  observedAt: string;
  qualityFlag: string;
}

// ---------- Vital View-Model (컴포넌트가 소비) ----------

/** 바이탈 시리즈 데이터 키 — 연속 측정값 */
export type VitalKey = 'hr' | 'map' | 'spo2' | 'rr' | 'temp' | 'gcs' | 'urine_output';

/** 바이탈 차트 그룹 탭 키 — SOFA + 6개 장기 시스템 + Temp */
export type TabKey =
  | 'sofa'
  | 'cardio'
  | 'resp'
  | 'renal'
  | 'cns'
  | 'coag'
  | 'hepatic'
  | 'temp';

/** 바이탈 시계열 데이터 (pivot된 view-model) */
export interface VitalSeries {
  label: string;
  unit: string;
  data: number[];
  normal: [number, number];
  times: string[];
}

/**
 * 검사 수치 annotation (Lac/Cre 등).
 * type은 차트 그룹 탭 분류 키. metric_code(`lactate`)는 별도 보존.
 */
export interface LabDot {
  time: string;
  label: string;
  value: number;
  type: 'lac' | 'cre' | 'pf_ratio' | 'platelet' | 'bilirubin';
  /** API metric_code. 풀네임 (lactate, creatinine, pao2_fio2, platelet, bilirubin). */
  metricCode?: string;
}

export interface VitalData {
  series: Record<VitalKey, VitalSeries>;
  labs: LabDot[];
}

// ---------- SOFA ----------

/**
 * SOFA 6개 장기 키 — API/DB 표준 풀네임.
 * (mock 시절 cardio/resp/hepatic/coag는 v4부터 풀네임으로 통일)
 */
export type OrganKey =
  | 'cardiovascular'
  | 'respiration'
  | 'cns'
  | 'liver'
  | 'renal'
  | 'coagulation';

/** /sofa 응답의 sofa_trend[i] — 시점별 row (wire) */
export interface SofaTrendRow {
  observedAt: string;
  sofaTotal: number;
  components: Record<OrganKey, number | null>;
}

/** view-model: 시간축과 organ별 시계열 (컴포넌트가 소비) */
export interface SofaTrend {
  times: string[];
  scores: Record<OrganKey, Array<number | null>>;
  totals?: number[];
}

// ---------- 예측 (Prediction) ----------

/** SHAP 피처 기여도 (API 응답 형태) */
export interface ShapFactor {
  feature: string;
  value: number;
  direction: 'increase' | 'decrease';
  contribution: number;
}

/** 단일 모델 최신 예측 (GET /predictions 응답의 predictions[i]) */
export interface LatestPrediction {
  predictionId: string;
  modelKey: ApiModelKey;
  modelVersion: string;
  targetName: TargetName | EscalationTarget;
  horizonHours: number;
  riskScore: number;
  riskLabel: RiskLevel;
  threshold: number;
  predictedAt: string;
  featureWindowStart: string;
  featureWindowEnd: string;
  topFactors: ShapFactor[];
  status: string;
}

/** /predictions/{modelKey}/history 응답의 history[i] */
export interface PredictionHistoryPoint {
  predictionId: string;
  riskScore: number;
  riskLabel: RiskLevel;
  predictedAt: string;
  status: string;
}

export interface PredictionHistory {
  stayToken: string;
  modelKey: ApiModelKey;
  history: PredictionHistoryPoint[];
}

// ---------- 모델 카드 view-model (Phase 1 호환) ----------
//
// 기존 컴포넌트(ModelCard, ModelDetailView)가 소비하던 ModelPrediction 구조를
// 유지하되, 데이터 출처는 LatestPrediction + PredictionHistory + ClinicalObservation
// + AiInsight로부터 service 레이어가 조립한다.
//
// Phase 2에서 컴포넌트가 직접 LatestPrediction을 다루게 되면 이 view-model은 제거 예정.

/** 확률 추이 데이터 포인트 */
export interface TrendPoint {
  t: string;
  pct: number;
  shap?: ShapFeature[];
}

export interface TrendWarning {
  delta: string;
  note: string;
}

/**
 * UI에서 사용하는 SHAP feature (display 문자열 합쳐진 형태).
 *
 * - `name`: 표시용 문자열 (display_name + feature value + unit으로 service에서 조립).
 * - `value`: ⚠️ UI bar 크기 산정에 쓰이는 SHAP 기여도 값. (`contribution`과 동일하게 채움)
 * - `direction`: 'up'(상승 기여) / 'down'(감소 기여).
 * - `contribution`: API ShapFactor에서 받은 raw 기여도 (0~1 범위). 향후 UI에서 활용.
 */
export interface ShapFeature {
  name: string;
  value: number;
  direction: 'up' | 'down';
  contribution?: number;
}

/** Raw 임상 지표 */
export interface RawMetric {
  label: string;
  value: string;
  unit: string;
  time: string;
  isModelInput: boolean;
  /** API metric_code (lactate 등) — model input 매칭 시 사용 */
  metricCode?: string;
}

/**
 * 보조지표 필요 가능성 — 모델 예측 기반.
 *
 *  - `highNeed`: 모델이 12시간 내 해당 치료가 필요할 가능성이 높다고 예측 (risk_label === 'high').
 *  - `lowNeed`:  필요 가능성 낮음 (예측 위험이 낮음).
 *
 * ⚠️ "현재 사용 중"이 아니라 "예측 기반 필요성"이다.
 *    실제 치료 사용 여부는 `clinical_observations`(예: vasopressor_in_use)에서 별도 파생해야 함.
 */
export type EscalationNeed = 'lowNeed' | 'highNeed';

/** 보조지표 — 치료 에스컬레이션 예측 */
export interface EscalationPrediction {
  title: string;
  shortLabel: string;
  /** 0~100 (%) */
  probability: number;
  /** 모델 예측 기반 필요 가능성. EscalationNeed 참조. */
  need: EscalationNeed;
  shap: ShapFeature[];
}

/** 모델 카드/모델 상세 view-model */
export interface ModelPrediction {
  title: string;
  tone: RiskTone;
  /** API risk_label에서 유래. 컴포넌트가 직접 쓸 때만 채워짐. */
  riskLabel?: RiskLevel;
  /** 0~100 (%) — API risk_score(0~1) × 100 */
  riskScorePct?: number;
  trend: TrendPoint[];
  trendWarn: TrendWarning;
  shap: ShapFeature[];
  raw: RawMetric[];
  llmSummary: string;
  escalation?: EscalationPrediction;
}

// ---------- ICU 현황 KPI ----------

export interface KpiData {
  label: string;
  value: string | number;
  sub: string;
  tone?: RiskTone | 'default';
  icon?: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
}

// ---------- 환자 요약 보고서 (view-model) ----------

export type VitalStatusLevel = 'normal' | 'attention' | 'critical';

export interface ReportVitalRow {
  key: VitalKey;
  label: string;
  unit: string;
  latestValue: number | null;
  latestTime: string | null;
  normalRange: [number, number];
  status: VitalStatusLevel;
}

export interface ReportLabRow {
  label: string;
  value: string;
  unit: string;
  time: string;
  normalRange: string;
}

export interface ReportPrediction {
  key: TargetName;
  title: string;
  /** 0~100 (%) */
  probability: number;
  risk: RiskLevel;
}

/** 환자 상태 요약 보고서 view-model (프론트 조합) */
export interface PatientReport {
  patient: PatientDetail;
  generatedAt: Date;
  vitals: ReportVitalRow[];
  labs: ReportLabRow[];
  predictions: ReportPrediction[];
}

/** GET /icu-stays/{stayId}/report/latest (저장된 보고서 메타) */
export interface SavedReport {
  reportId: string;
  stayToken: string;
  reportType: string;
  reportTitle: string;
  reportStatus: string;
  generatedAt: string;
  generatedByStaffId: string;
  availableFormats: Array<'html' | 'pdf'>;
  htmlDownloadUrl: string;
  pdfDownloadUrl: string;
}

// ---------- 협진 ----------

export type ConsultPriority = 'urgent' | 'routine';

/** API 표준 enum (mock 시절 'pending'/'accepted' 폐기) */
export type ConsultStatus = 'requested' | 'in_progress' | 'completed';

export interface ConsultRecipient {
  staffId: string | null;
  departmentCode: string;
  role: 'to' | 'cc';
}

/** GET /consultations 응답의 consultations[i] */
export interface ConsultationRequest {
  consultationId: string;
  stayToken: string;
  subject: string;
  priority: ConsultPriority;
  status: ConsultStatus;
  requesterStaffId: string;
  requesterDepartmentCode: string;
  recipients: ConsultRecipient[];
  attachedReportId: string | null;
  createdAt: string;
}

/** GET /consultations/{consultationId} 응답 */
export interface ConsultationDetail extends ConsultationRequest {
  message: string;
  notes: Array<{ staffId: string; note: string; createdAt: string }>;
  statusHistory: Array<{ from: ConsultStatus | null; to: ConsultStatus; at: string; by: string }>;
  updatedAt: string;
}

/** GET /staff/departments 응답의 departments[i] */
export interface Department {
  configKey: string;
  displayName: string;
  sortOrder: number;
}

/** GET /staff 응답의 staff[i] */
export interface StaffMember {
  staffId: string;
  displayName: string;
  role: string;
  primaryDepartmentCode: string;
  status: string;
}

// ---------- 임상 타임라인 ----------

/** API timeline.item_type — 데이터 출처 분류 */
export type TimelineItemType = 'prediction' | 'alert' | 'event';

/** mock 시절 category와 호환되는 표시용 분류 (item.detail_category에서 옴) */
export type TimelineEventCategory =
  | 'vitals'
  | 'lab'
  | 'medication'
  | 'procedure'
  | 'assessment'
  | 'alert'
  | 'mortality'
  | 'aki'
  | 'ards'
  | 'sic'
  | 'shock';

export type TimelineEventSeverity = 'critical' | 'warning' | 'info';

/**
 * /timeline 응답의 timeline[i] (view-model로 정규화 후 컴포넌트가 소비).
 * - time: 표시용 문자열 ("14:20") — service에서 ISO → 표시 변환
 * - description: API의 summary 필드를 옮긴 값
 * - category: API의 detail_category. 아이콘 분기에 사용
 */
export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  category: TimelineEventCategory;
  severity: TimelineEventSeverity;
  itemType?: TimelineItemType;
}

/** /schedule 응답의 scheduled_events[i] (view-model) */
export interface ScheduledEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  category: TimelineEventCategory;
  basis: string;
}

// ---------- 알림 ----------

/**
 * mock 시절 source(light_model/deep_model/threshold)에 대응.
 * API alert_source는 model_key 또는 trigger_rule_key가 들어옴.
 */
export type AlertSource = string;

/** API severity — 3단계 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/** API status — 'new' 폐기, 'active' 사용 */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

/** UI 액션은 프론트 책임 — severity/status로 컴포넌트가 결정 */
export type AlertActionType = 'view_patient' | 'acknowledge' | 'escalate' | 'resolve';

export interface AlertAction {
  type: AlertActionType;
  label: string;
}

/** notification_deliveries (per-user 읽음/확인) */
export interface AlertDelivery {
  deliveryId: string;
  readAt: string | null;
  acknowledgedAt: string | null;
}

/** GET /alerts 응답의 alerts[i] */
export interface Alert {
  alertId: string;
  stayToken: string;
  alertType: string;
  alertSource: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  tags: string[];
  /** 모델 출처 알림일 때만 — 0~1 실수 (API 기준) */
  confidence: number | null;
  createdAt: string;
  delivery: AlertDelivery;
}

export interface AlertCount {
  total: number;
  unread: number;
  criticalUnread: number;
}

// ---------- 호환 alias (Phase 2 정리 예정) ----------

/**
 * 기존 컴포넌트의 `patient` prop은 ICU 메인/환자 상세 양쪽에서 사용된다.
 * 둘 모두를 다룰 수 있는 공용 view-model alias.
 * 새 코드는 DashboardPatient 또는 PatientDetail을 직접 사용 권장.
 */
export type Patient = DashboardPatient | PatientDetail;
