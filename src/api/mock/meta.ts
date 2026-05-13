/**
 * /me, /meta/metrics, /meta/models 응답을 모사한 mock.
 * 앱 부트 시 MetaContext가 한 번 로드해 메모리에 캐싱한다.
 */

export interface WireMe {
  staff_id: string;
  cognito_sub: string;
  display_name: string;
  role: string;
  primary_department_code: string;
  roles_jsonb: string[];
  status: string;
  last_login_at: string;
}

export interface WireMetric {
  config_key: string;
  display_name: string;
  metric_group: 'vital' | 'lab' | 'derived' | 'sofa';
  unit: string;
  normal_range_low: number | null;
  normal_range_high: number | null;
  sort_order: number;
}

export interface WireModelMeta {
  model_key: string;
  model_version: string;
  model_name: string;
  model_type: string;
  target_name: string;
  horizon_hours: number;
  endpoint_type: string;
  default_threshold: number;
  input_features: string[];
}

export const mockMe: WireMe = {
  staff_id: 'staff-010',
  cognito_sub: 'cognito-mock-sub',
  display_name: '담당 의료진',
  role: 'physician',
  primary_department_code: 'icu',
  roles_jsonb: ['physician', 'icu_attending'],
  status: 'active',
  last_login_at: '2026-05-11T09:00:00Z',
};

export const mockMetrics: WireMetric[] = [
  { config_key: 'hr',                display_name: 'Heart Rate',        metric_group: 'vital',   unit: 'bpm',      normal_range_low: 60,   normal_range_high: 100, sort_order: 1 },
  { config_key: 'map',               display_name: 'MAP',               metric_group: 'vital',   unit: 'mmHg',     normal_range_low: 65,   normal_range_high: 90,  sort_order: 2 },
  { config_key: 'spo2',              display_name: 'SpO₂',              metric_group: 'vital',   unit: '%',        normal_range_low: 94,   normal_range_high: 100, sort_order: 3 },
  { config_key: 'rr',                display_name: 'Respiratory Rate',  metric_group: 'vital',   unit: '/min',     normal_range_low: 12,   normal_range_high: 20,  sort_order: 4 },
  { config_key: 'temp',              display_name: 'Temperature',       metric_group: 'vital',   unit: '°C',       normal_range_low: 36,   normal_range_high: 37.5, sort_order: 5 },
  { config_key: 'gcs',               display_name: 'GCS',               metric_group: 'vital',   unit: '',         normal_range_low: 15,   normal_range_high: 15, sort_order: 6 },
  { config_key: 'urine_output',      display_name: 'Urine Output',      metric_group: 'vital',   unit: 'mL/h',     normal_range_low: 50,   normal_range_high: 200, sort_order: 7 },
  { config_key: 'fio2',              display_name: 'FiO₂',              metric_group: 'vital',   unit: '',         normal_range_low: 0.21, normal_range_high: 0.40, sort_order: 8 },
  { config_key: 'lactate',           display_name: 'Lactate',           metric_group: 'lab',     unit: 'mmol/L',   normal_range_low: 0.5,  normal_range_high: 2.0, sort_order: 10 },
  { config_key: 'creatinine',        display_name: 'Creatinine',        metric_group: 'lab',     unit: 'mg/dL',    normal_range_low: 0.6,  normal_range_high: 1.3, sort_order: 11 },
  { config_key: 'pao2_fio2',         display_name: 'PaO2/FiO2',         metric_group: 'lab',     unit: '',         normal_range_low: 400,  normal_range_high: 500, sort_order: 12 },
  { config_key: 'platelet',          display_name: 'Platelet',          metric_group: 'lab',     unit: 'x10³/µL',  normal_range_low: 150,  normal_range_high: 400, sort_order: 13 },
  { config_key: 'bilirubin',         display_name: 'Bilirubin',         metric_group: 'lab',     unit: 'mg/dL',    normal_range_low: 0.2,  normal_range_high: 1.2, sort_order: 14 },
  { config_key: 'bun',               display_name: 'BUN',               metric_group: 'lab',     unit: 'mg/dL',    normal_range_low: 8,    normal_range_high: 20, sort_order: 15 },
  { config_key: 'pt_inr',            display_name: 'PT-INR',            metric_group: 'lab',     unit: '',         normal_range_low: 0.8,  normal_range_high: 1.2, sort_order: 16 },
  { config_key: 'd_dimer',           display_name: 'D-dimer',           metric_group: 'lab',     unit: 'µg/mL',    normal_range_low: 0,    normal_range_high: 0.5, sort_order: 17 },
  { config_key: 'fibrinogen',        display_name: 'Fibrinogen',        metric_group: 'lab',     unit: 'mg/dL',    normal_range_low: 200,  normal_range_high: 400, sort_order: 18 },
  { config_key: 'wbc',               display_name: 'WBC',               metric_group: 'lab',     unit: 'x10³/µL',  normal_range_low: 4,    normal_range_high: 11, sort_order: 19 },
  { config_key: 'potassium',         display_name: 'K+',                metric_group: 'lab',     unit: 'mmol/L',   normal_range_low: 3.5,  normal_range_high: 5.0, sort_order: 20 },
  { config_key: 'cvp',               display_name: 'CVP',               metric_group: 'vital',   unit: 'mmHg',     normal_range_low: 2,    normal_range_high: 8, sort_order: 21 },
  { config_key: 'sofa_total',        display_name: 'SOFA',              metric_group: 'derived', unit: '',         normal_range_low: 0,    normal_range_high: 1, sort_order: 30 },
  { config_key: 'age',               display_name: 'Age',               metric_group: 'derived', unit: '세',       normal_range_low: null, normal_range_high: null, sort_order: 31 },
  { config_key: 'fluid_balance',     display_name: 'Fluid balance',     metric_group: 'derived', unit: 'L',        normal_range_low: -1,   normal_range_high: 1, sort_order: 32 },
  { config_key: 'vasopressor_use',   display_name: 'Vasopressor 사용',  metric_group: 'derived', unit: '',         normal_range_low: null, normal_range_high: null, sort_order: 33 },
];

// model_name은 카드 title에 그대로 노출되므로 horizon-포함 긴 라벨 대신
// 기존 mock에서 쓰던 짧은 이름을 사용한다. (조원 합의 전까지 horizon 라벨은 미노출)
// horizon 자체는 horizon_hours 필드로 별도 제공되므로 정보 손실 없음.
export const mockModels: WireModelMeta[] = [
  {
    model_key: 'mortality_48h', model_version: 'v6.1.0', model_name: '사망 위험',
    model_type: 'xgboost', target_name: 'mortality', horizon_hours: 48,
    endpoint_type: 'cpu', default_threshold: 0.5,
    input_features: ['hr', 'map', 'lactate', 'creatinine', 'platelet', 'bilirubin', 'pao2_fio2', 'gcs', 'urine_output', 'sofa_total'],
  },
  {
    model_key: 'aki_48h', model_version: 'v3.2.0', model_name: '급성 신손상 (AKI)',
    model_type: 'xgboost', target_name: 'aki', horizon_hours: 48,
    endpoint_type: 'cpu', default_threshold: 0.5,
    input_features: ['creatinine', 'urine_output', 'map', 'lactate'],
  },
  {
    model_key: 'ards_24h', model_version: 'v2.4.0', model_name: '급성호흡곤란증후군 (ARDS)',
    model_type: 'xgboost', target_name: 'ards', horizon_hours: 24,
    endpoint_type: 'cpu', default_threshold: 0.5,
    input_features: ['pao2_fio2', 'rr', 'spo2'],
  },
  {
    model_key: 'sic_24h', model_version: 'v2.0.0', model_name: '패혈증 유발 응고장애 (SIC)',
    model_type: 'xgboost', target_name: 'sic', horizon_hours: 24,
    endpoint_type: 'cpu', default_threshold: 0.5,
    input_features: ['platelet', 'bilirubin', 'sofa_total'],
  },
  {
    model_key: 'septic_shock_12h', model_version: 'v3.0.0', model_name: '패혈성 쇼크 (Septic Shock)',
    model_type: 'xgboost', target_name: 'shock', horizon_hours: 12,
    endpoint_type: 'cpu', default_threshold: 0.5,
    input_features: ['map', 'lactate', 'hr'],
  },
  {
    model_key: 'invasive_vent_12h', model_version: 'v1.0.0', model_name: '침습적 기계환기',
    model_type: 'xgboost', target_name: 'invasive_vent', horizon_hours: 12,
    endpoint_type: 'cpu', default_threshold: 0.4,
    input_features: ['pao2_fio2', 'rr', 'spo2'],
  },
  {
    model_key: 'vasopressor_12h', model_version: 'v1.0.0', model_name: '승압제',
    model_type: 'xgboost', target_name: 'vasopressor', horizon_hours: 12,
    endpoint_type: 'cpu', default_threshold: 0.4,
    input_features: ['map', 'hr', 'lactate'],
  },
];
