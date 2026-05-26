/**
 * /predictions, /predictions/{modelKey}/history, /clinical-data(prediction-related),
 * /ai/insights 응답을 모사한 mock.
 *
 * V4 API와 동일한 wire 모양으로 보관. service의 latestToView() 변환 경로를
 * mock으로도 동일하게 실행시켜 변환 로직을 검증한다.
 *
 *  - mockLatestByStay[stayToken]                 : WireLatestPrediction[]  (메인5 + 보조2)
 *  - mockHistoryByStayAndModel[stay][model]      : WireHistoryPoint[]
 *  - mockClinicalForModelByStay[stay]            : WireRawPoint[] (모델 카드 우측 Raw 임상지표)
 *  - mockLlmSummaryByStayAndTarget[stay][target] : string
 *
 * EscalationNeed(invasive_vent / vasopressor)는 별도 mock 없이 predictions의 risk_label에서
 * service의 deriveEscalationNeed()가 파생한다.
 */

import type { ApiModelKey, EscalationTarget, RiskLevel, TargetName } from '../../types';

/**
 * SHAP 기여도 항목. 백엔드는 두 가지 스키마 중 하나로 보낼 수 있어 모든 필드 optional:
 *   - 구 스키마: { feature, value, direction, contribution }
 *   - 신 스키마: { feature, shap_value, feature_value }  (실제 API)
 * mapShapFactor 가 둘 다 정규화한다.
 */
export interface WireShapFactor {
  feature: string;
  value?: number;
  direction?: 'increase' | 'decrease';
  contribution?: number;
  shap_value?: number;
  feature_value?: number;
}

export interface WireLatestPrediction {
  prediction_id: string;
  model_key: ApiModelKey;
  model_version: string;
  target_name: TargetName | EscalationTarget;
  horizon_hours: number;
  risk_score: number | null;
  risk_label: RiskLevel | null;
  threshold: number;
  predicted_at: string;
  feature_window_start: string;
  feature_window_end: string;
  /**
   * SHAP 원본. 실제 API는 두 필드를 모두 보낸다:
   *  - shap_summary_jsonb: { base_value, top_features:[{feature, shap_value, feature_value}] }
   *    → 실데이터(우선해서 읽음).
   *  - top_factors_jsonb: spec/레거시 필드. 항목에 feature 키가 없어 라벨이 undefined 로
   *    찍히던 원인. shap_summary_jsonb 가 없을 때만 fallback 으로 사용.
   * 둘 다 배열 / { base_value, top_features } 객체 / JSON 문자열 / null 형태로 올 수 있다.
   */
  shap_summary_jsonb?:
    | WireShapFactor[]
    | { base_value?: number; top_features: WireShapFactor[] }
    | string
    | null;
  top_factors_jsonb: WireShapFactor[] | { base_value?: number; top_features: WireShapFactor[] } | string | null;
  status: string;
}

export interface WireHistoryPoint {
  prediction_id: string;
  risk_score: number | null;
  risk_label: RiskLevel | null;
  predicted_at: string;
  status: string;
}

export interface WireRawPoint {
  /** 어느 모델 카드 우측 패널에 노출할지 — target_name으로 묶음 */
  target: TargetName;
  metric_code: string;
  numeric_value: number;
  unit: string;
  observed_at: string;
}

// -------- helpers --------

const REFERENCE_NOW_ISO = '2026-05-11T08:45:00+09:00';
const REFERENCE_MS = new Date(REFERENCE_NOW_ISO).getTime();
const HOUR_MS = 3600_000;

function isoOffsetHours(hoursAgo: number): string {
  return new Date(REFERENCE_MS - hoursAgo * HOUR_MS).toISOString();
}

function isoOffsetMinutes(minutesAgo: number): string {
  return new Date(REFERENCE_MS - minutesAgo * 60_000).toISOString();
}

function riskLabelFromScore(score: number): RiskLevel {
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}

interface BuildArgs {
  modelKey: ApiModelKey;
  targetName: TargetName | EscalationTarget;
  horizonHours: number;
  threshold: number;
  /** 24h-old → now 순서. risk_score(0~1). 마지막 값이 latest. */
  trendScores: number[];
  topFactors: WireShapFactor[];
}

function buildLatestAndHistory(args: BuildArgs, stayToken: string): {
  latest: WireLatestPrediction;
  history: WireHistoryPoint[];
} {
  const n = args.trendScores.length;
  // 24h ~ 0h를 균등 분배. n=7이면 -24,-20,...,-0
  const stepHours = n > 1 ? 24 / (n - 1) : 0;
  const history: WireHistoryPoint[] = args.trendScores.map((s, i) => ({
    prediction_id: `pred-${stayToken}-${args.modelKey}-${i}`,
    risk_score: s,
    risk_label: riskLabelFromScore(s),
    predicted_at: isoOffsetHours(24 - i * stepHours),
    status: 'completed',
  }));
  const lastScore = args.trendScores[n - 1] ?? 0;
  const latestPredictedAt = history[n - 1]?.predicted_at ?? REFERENCE_NOW_ISO;
  const latest: WireLatestPrediction = {
    prediction_id: history[n - 1]?.prediction_id ?? `pred-${stayToken}-${args.modelKey}-latest`,
    model_key: args.modelKey,
    model_version: 'v6.1.0',
    target_name: args.targetName,
    horizon_hours: args.horizonHours,
    risk_score: lastScore,
    risk_label: riskLabelFromScore(lastScore),
    threshold: args.threshold,
    predicted_at: latestPredictedAt,
    feature_window_start: isoOffsetHours(24),
    feature_window_end: latestPredictedAt,
    top_factors_jsonb: args.topFactors,
    status: 'completed',
  };
  return { latest, history };
}

// -------- ST-19482 (rich) --------

const PT19482_MORTALITY = buildLatestAndHistory(
  {
    modelKey: 'mortality_48h',
    targetName: 'mortality',
    horizonHours: 48,
    threshold: 0.5,
    trendScores: [0.48, 0.52, 0.55, 0.61, 0.68, 0.72, 0.74],
    topFactors: [
      { feature: 'lactate',   value: 5.2, direction: 'increase', contribution: 0.28 },
      { feature: 'map',       value: 58,  direction: 'decrease', contribution: 0.21 },
      { feature: 'sofa_total', value: 12, direction: 'increase', contribution: 0.18 },
      { feature: 'age',       value: 72,  direction: 'increase', contribution: 0.09 },
      { feature: 'pao2fio2ratio', value: 180, direction: 'decrease', contribution: 0.07 },
    ],
  },
  'ST-19482',
);

const PT19482_AKI = buildLatestAndHistory(
  {
    modelKey: 'aki_48h',
    targetName: 'aki',
    horizonHours: 48,
    threshold: 0.5,
    trendScores: [0.41, 0.46, 0.52, 0.58, 0.62, 0.65, 0.68],
    topFactors: [
      { feature: 'urine_output',    value: 0.3,  direction: 'decrease', contribution: 0.24 },
      { feature: 'creatinine',      value: 2.1,  direction: 'increase', contribution: 0.22 },
      { feature: 'map',             value: 58,   direction: 'decrease', contribution: 0.15 },
      { feature: 'vasopressor_use', value: 1,    direction: 'increase', contribution: 0.11 },
      { feature: 'age',             value: 72,   direction: 'increase', contribution: 0.06 },
    ],
  },
  'ST-19482',
);

const PT19482_ARDS = buildLatestAndHistory(
  {
    modelKey: 'ards_24h',
    targetName: 'ards',
    horizonHours: 24,
    threshold: 0.5,
    trendScores: [0.32, 0.34, 0.38, 0.42, 0.45, 0.48, 0.51],
    topFactors: [
      { feature: 'pao2fio2ratio', value: 180,  direction: 'decrease', contribution: 0.26 },
      { feature: 'spo2',      value: 91,   direction: 'decrease', contribution: 0.18 },
      { feature: 'rr',        value: 28,   direction: 'increase', contribution: 0.12 },
      { feature: 'fio2',      value: 0.6,  direction: 'increase', contribution: 0.09 },
      { feature: 'lactate',   value: 5.2,  direction: 'increase', contribution: 0.05 },
    ],
  },
  'ST-19482',
);

const PT19482_SIC = buildLatestAndHistory(
  {
    modelKey: 'sic_24h',
    targetName: 'sic',
    horizonHours: 24,
    threshold: 0.5,
    trendScores: [0.28, 0.30, 0.33, 0.36, 0.39, 0.42, 0.44],
    topFactors: [
      { feature: 'platelet',    value: 92,    direction: 'decrease', contribution: 0.22 },
      { feature: 'pt_inr',      value: 1.8,   direction: 'increase', contribution: 0.18 },
      { feature: 'sofa_total',  value: 12,    direction: 'increase', contribution: 0.11 },
      { feature: 'd_dimer',     value: 6.2,   direction: 'increase', contribution: 0.09 },
      { feature: 'fibrinogen',  value: 180,   direction: 'decrease', contribution: 0.05 },
    ],
  },
  'ST-19482',
);

const PT19482_SHOCK = buildLatestAndHistory(
  {
    modelKey: 'septic_shock_12h',
    targetName: 'shock',
    horizonHours: 12,
    threshold: 0.5,
    trendScores: [0.44, 0.50, 0.55, 0.60, 0.64, 0.68, 0.71],
    topFactors: [
      { feature: 'map',            value: 58,   direction: 'decrease', contribution: 0.27 },
      { feature: 'lactate',        value: 5.2,  direction: 'increase', contribution: 0.23 },
      { feature: 'hr',             value: 124,  direction: 'increase', contribution: 0.14 },
      { feature: 'fluid_balance',  value: 2.4,  direction: 'increase', contribution: 0.08 },
      { feature: 'temp',           value: 38.9, direction: 'increase', contribution: 0.04 },
    ],
  },
  'ST-19482',
);

const PT19482_INV_VENT = buildLatestAndHistory(
  {
    modelKey: 'invasive_vent_12h',
    targetName: 'invasive_vent',
    horizonHours: 12,
    threshold: 0.4,
    trendScores: [0.20, 0.24, 0.28, 0.32, 0.34, 0.36, 0.38],
    topFactors: [
      { feature: 'pao2fio2ratio', value: 180, direction: 'decrease', contribution: 0.22 },
      { feature: 'rr',        value: 28,  direction: 'increase', contribution: 0.14 },
      { feature: 'fio2',      value: 0.6, direction: 'increase', contribution: 0.09 },
    ],
  },
  'ST-19482',
);

const PT19482_VASO = buildLatestAndHistory(
  {
    modelKey: 'vasopressor_12h',
    targetName: 'vasopressor',
    horizonHours: 12,
    threshold: 0.4,
    trendScores: [0.30, 0.34, 0.40, 0.45, 0.48, 0.50, 0.52],
    topFactors: [
      { feature: 'map',            value: 58,   direction: 'decrease', contribution: 0.26 },
      { feature: 'lactate',        value: 5.2,  direction: 'increase', contribution: 0.18 },
      { feature: 'fluid_balance',  value: 2.4,  direction: 'increase', contribution: 0.12 },
    ],
  },
  'ST-19482',
);

const PT19482_LATEST: WireLatestPrediction[] = [
  PT19482_MORTALITY.latest,
  PT19482_AKI.latest,
  PT19482_ARDS.latest,
  PT19482_SIC.latest,
  PT19482_SHOCK.latest,
  PT19482_INV_VENT.latest,
  PT19482_VASO.latest,
];

const PT19482_HISTORY: Record<ApiModelKey, WireHistoryPoint[]> = {
  mortality_48h:     PT19482_MORTALITY.history,
  aki_48h:           PT19482_AKI.history,
  ards_24h:          PT19482_ARDS.history,
  sic_24h:           PT19482_SIC.history,
  septic_shock_12h:  PT19482_SHOCK.history,
  invasive_vent_12h: PT19482_INV_VENT.history,
  vasopressor_12h:   PT19482_VASO.history,
};

const PT19482_RAW: WireRawPoint[] = [
  // mortality 카드 raw
  { target: 'mortality', metric_code: 'lactate',     numeric_value: 5.2,  unit: 'mmol/L', observed_at: isoOffsetMinutes(30) },
  { target: 'mortality', metric_code: 'map',         numeric_value: 58,   unit: 'mmHg',   observed_at: isoOffsetMinutes(15) },
  { target: 'mortality', metric_code: 'hr',          numeric_value: 124,  unit: 'bpm',    observed_at: isoOffsetMinutes(10) },
  { target: 'mortality', metric_code: 'spo2',        numeric_value: 91,   unit: '%',      observed_at: isoOffsetMinutes(10) },
  { target: 'mortality', metric_code: 'temp',        numeric_value: 38.9, unit: '°C',     observed_at: isoOffsetMinutes(20) },
  { target: 'mortality', metric_code: 'wbc',         numeric_value: 18.4, unit: 'x10³/µL', observed_at: isoOffsetHours(1) },
  // aki 카드 raw
  { target: 'aki', metric_code: 'creatinine',   numeric_value: 2.1, unit: 'mg/dL',    observed_at: isoOffsetHours(1) },
  { target: 'aki', metric_code: 'urine_output', numeric_value: 0.3, unit: 'mL/kg/h',  observed_at: isoOffsetHours(1) },
  { target: 'aki', metric_code: 'bun',          numeric_value: 38,  unit: 'mg/dL',    observed_at: isoOffsetHours(1) },
  { target: 'aki', metric_code: 'potassium',    numeric_value: 5.1, unit: 'mmol/L',   observed_at: isoOffsetHours(1) },
  // ards 카드 raw
  { target: 'ards', metric_code: 'pao2fio2ratio', numeric_value: 180,  unit: '',     observed_at: isoOffsetMinutes(30) },
  { target: 'ards', metric_code: 'spo2',      numeric_value: 91,   unit: '%',    observed_at: isoOffsetMinutes(10) },
  { target: 'ards', metric_code: 'fio2',      numeric_value: 0.6,  unit: '',     observed_at: isoOffsetMinutes(10) },
  { target: 'ards', metric_code: 'rr',        numeric_value: 28,   unit: '/min', observed_at: isoOffsetMinutes(10) },
  // sic 카드 raw
  { target: 'sic', metric_code: 'platelet',   numeric_value: 92,   unit: 'x10³/µL', observed_at: isoOffsetHours(1) },
  { target: 'sic', metric_code: 'pt_inr',     numeric_value: 1.8,  unit: '',         observed_at: isoOffsetHours(1) },
  { target: 'sic', metric_code: 'd_dimer',    numeric_value: 6.2,  unit: 'µg/mL',    observed_at: isoOffsetHours(1) },
  { target: 'sic', metric_code: 'fibrinogen', numeric_value: 180,  unit: 'mg/dL',    observed_at: isoOffsetHours(1) },
  // shock 카드 raw
  { target: 'shock', metric_code: 'map',           numeric_value: 58,   unit: 'mmHg',    observed_at: isoOffsetMinutes(15) },
  { target: 'shock', metric_code: 'lactate',       numeric_value: 5.2,  unit: 'mmol/L',  observed_at: isoOffsetMinutes(30) },
  { target: 'shock', metric_code: 'hr',            numeric_value: 124,  unit: 'bpm',     observed_at: isoOffsetMinutes(10) },
  { target: 'shock', metric_code: 'cvp',           numeric_value: 10,   unit: 'mmHg',    observed_at: isoOffsetMinutes(30) },
  { target: 'shock', metric_code: 'fluid_balance', numeric_value: 2.4,  unit: 'L',       observed_at: isoOffsetHours(1) },
];

const PT19482_LLM: Record<TargetName, string> = {
  mortality:
    '혈압 저하와 lactate 상승이 동반되며 장기부전 지표가 빠르게 악화되는 패턴입니다. 원인 감염 제어와 관류 회복에 대한 평가가 필요합니다. 본 텍스트는 AI 생성이며 임상 판단을 대체하지 않습니다.',
  aki:
    '소변량 감소와 신기능 지표 악화가 진행 중이며, 관류 저하와 연관된 패턴으로 보입니다. 수액/승압제 반응 평가가 필요합니다.',
  ards:
    '산소화 저하와 호흡수 증가가 동반되어 호흡부전 악화 가능성이 평가 필요합니다. 침습적 기계환기 전환 준비 여부를 판단하십시오.',
  sic:
    '응고 지표가 점진적으로 악화되어 SIC 발생 가능성이 증가하는 양상입니다. 추가 혈액검사 및 출혈 위험 평가가 권고됩니다.',
  shock:
    '수액 소생에도 평균동맥압이 회복되지 않고 lactate가 상승합니다. 승압제 요구 가능성에 대한 평가가 필요합니다.',
};

// -------- 단순(저위험) 스테이용 빌더 --------

interface SimpleSpec {
  mortality: number;
  aki: number;
  ards: number;
  sic: number;
  shock: number;
}

function buildSimpleStay(stayToken: string, spec: SimpleSpec): {
  latest: WireLatestPrediction[];
  history: Record<ApiModelKey, WireHistoryPoint[]>;
} {
  const make = (
    modelKey: ApiModelKey,
    target: TargetName,
    horizon: number,
    score: number,
  ) => {
    // 단순 환자: 7개 trend point는 끝값 근처에서 약하게 변동
    const seq = Array.from({ length: 7 }, (_, i) =>
      Math.max(0, Math.min(1, score - 0.04 + (i / 6) * 0.04)),
    );
    return buildLatestAndHistory(
      {
        modelKey,
        targetName: target,
        horizonHours: horizon,
        threshold: 0.5,
        trendScores: seq,
        topFactors: [],
      },
      stayToken,
    );
  };
  const m = make('mortality_48h',    'mortality', 48, spec.mortality);
  const a = make('aki_48h',          'aki',       48, spec.aki);
  const r = make('ards_24h',         'ards',      24, spec.ards);
  const s = make('sic_24h',          'sic',       24, spec.sic);
  const sh = make('septic_shock_12h','shock',     12, spec.shock);
  return {
    latest: [m.latest, a.latest, r.latest, s.latest, sh.latest],
    history: {
      mortality_48h: m.history,
      aki_48h: a.history,
      ards_24h: r.history,
      sic_24h: s.history,
      septic_shock_12h: sh.history,
      // 단순 stay는 보조지표 없음
      invasive_vent_12h: [],
      vasopressor_12h: [],
    },
  };
}

const SIMPLE_STAYS: Record<string, SimpleSpec> = {
  'ST-20314': { mortality: 0.68, aki: 0.45, ards: 0.62, sic: 0.41, shock: 0.45 },
  'ST-20781': { mortality: 0.42, aki: 0.44, ards: 0.40, sic: 0.18, shock: 0.40 },
  'ST-21005': { mortality: 0.40, aki: 0.42, ards: 0.16, sic: 0.40, shock: 0.41 },
  'ST-21219': { mortality: 0.38, aki: 0.18, ards: 0.36, sic: 0.16, shock: 0.40 },
  'ST-21442': { mortality: 0.18, aki: 0.15, ards: 0.14, sic: 0.12, shock: 0.16 },
  'ST-21508': { mortality: 0.15, aki: 0.13, ards: 0.12, sic: 0.10, shock: 0.14 },
  'ST-21603': { mortality: 0.12, aki: 0.11, ards: 0.10, sic: 0.09, shock: 0.11 },
};

// -------- 최종 lookup 테이블 --------

export const mockLatestByStay: Record<string, WireLatestPrediction[]> = {
  'ST-19482': PT19482_LATEST,
};

export const mockHistoryByStayAndModel: Record<string, Record<ApiModelKey, WireHistoryPoint[]>> = {
  'ST-19482': PT19482_HISTORY,
};

export const mockClinicalForModelByStay: Record<string, WireRawPoint[]> = {
  'ST-19482': PT19482_RAW,
};

export const mockLlmSummaryByStayAndTarget: Record<string, Partial<Record<TargetName, string>>> = {
  'ST-19482': PT19482_LLM,
};

for (const [stay, spec] of Object.entries(SIMPLE_STAYS)) {
  const built = buildSimpleStay(stay, spec);
  mockLatestByStay[stay] = built.latest;
  mockHistoryByStayAndModel[stay] = built.history;
  mockClinicalForModelByStay[stay] = [];
  mockLlmSummaryByStayAndTarget[stay] = {};
}
