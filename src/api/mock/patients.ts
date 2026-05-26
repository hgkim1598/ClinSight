/**
 * V4 응답 모양으로 작성된 mock 데이터.
 *
 * 두 가지 페이로드를 제공:
 *  - mockDashboardPayload   : GET /dashboard/icu/{icuId} 의 응답 본문 (data 부분)
 *  - mockPatientDetailByStay: GET /icu-stays/{stayId} 응답 모음 (stayToken 키)
 *
 * 모든 필드명은 API 명세 그대로(snake_case 가 아닌 camelCase로 미리 매핑된 상태가 아니라
 * "wire response의 JSON 키와 동일한 camelCase"). 실제 백엔드는 snake_case로 내려보내며,
 * service 함수에서 명시 매핑한다. mock은 service의 매핑 함수가 받을 입력 형태로 둔다.
 */

// snake_case API 응답을 그대로 옮긴 wire 형태. service에서 camelCase로 변환.
export interface WireDashboardPatient {
  stay_id: string;
  stay_token: string;
  patient_token: string;
  current_bed_label: string;
  age_group: string;
  sex: 'M' | 'F';
  latest_mortality_risk_score: number | null;
  latest_mortality_risk_label: 'high' | 'medium' | 'low' | null;
  latest_complication_risk_score: number | null;
  sepsis_light_prob?: number | null;
  latest_sofa_total: number;
  active_alert_count: number;
  last_prediction_at: string;
  last_observation_at: string;
}

export interface WireDashboardResponse {
  icu_unit: { unit_code: string; display_name: string };
  patients: WireDashboardPatient[];
  summary: {
    total_patients: number;
    high_risk_count: number;
    critical_alert_count: number;
  };
}

export interface WirePatientDetail {
  stay_id: string;
  stay_token: string;
  patient_token: string;
  age_years: number;
  sex: 'M' | 'F';
  primary_diagnosis_text: string;
  icu_in_at: string;
  icu_out_at: string | null;
  current_unit_code: string;
  current_bed_label: string;
  status: string;
  sepsis_onset_at: string | null;
  // 실제 API 미제공 — optional 처리 후 mapPatientDetail 에서 폴백.
  // TODO: 백엔드 필드 추가 후 optional 제거.
  age_group?: string;
  admission_type?: string;
  primary_diagnosis_code?: string;
  hospital_admit_at?: string;
  // 실제 API가 환자 상세에 함께 내려주는 필드 (현재 미사용 — predictions 는 별도 API로 조회).
  predictions?: Record<string, { risk_score: number | null; risk_label: string | null }>;
  active_alert_count?: number;
}

const dashboardPatients: WireDashboardPatient[] = [
  {
    stay_id: 'stay-19482',
    stay_token: 'ST-19482',
    patient_token: 'PT-19482',
    current_bed_label: 'A-01',
    age_group: '70s',
    sex: 'M',
    latest_mortality_risk_score: 0.74,
    latest_mortality_risk_label: 'high',
    latest_complication_risk_score: 0.68,
    sepsis_light_prob: 0.82,
    latest_sofa_total: 12,
    active_alert_count: 3,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
  {
    stay_id: 'stay-20314',
    stay_token: 'ST-20314',
    patient_token: 'PT-20314',
    current_bed_label: 'A-02',
    age_group: '60s',
    sex: 'F',
    latest_mortality_risk_score: 0.66,
    latest_mortality_risk_label: 'high',
    latest_complication_risk_score: 0.54,
    sepsis_light_prob: 0.71,
    latest_sofa_total: 11,
    active_alert_count: 2,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
  {
    stay_id: 'stay-20781',
    stay_token: 'ST-20781',
    patient_token: 'PT-20781',
    current_bed_label: 'A-03',
    age_group: '50s',
    sex: 'M',
    latest_mortality_risk_score: 0.45,
    latest_mortality_risk_label: 'medium',
    latest_complication_risk_score: 0.42,
    sepsis_light_prob: 0.52,
    latest_sofa_total: 8,
    active_alert_count: 1,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
  {
    stay_id: 'stay-21005',
    stay_token: 'ST-21005',
    patient_token: 'PT-21005',
    current_bed_label: 'A-04',
    age_group: '60s',
    sex: 'F',
    latest_mortality_risk_score: 0.41,
    latest_mortality_risk_label: 'medium',
    latest_complication_risk_score: 0.38,
    sepsis_light_prob: 0.45,
    latest_sofa_total: 7,
    active_alert_count: 1,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
  {
    stay_id: 'stay-21219',
    stay_token: 'ST-21219',
    patient_token: 'PT-21219',
    current_bed_label: 'A-05',
    age_group: '50s',
    sex: 'M',
    latest_mortality_risk_score: 0.36,
    latest_mortality_risk_label: 'medium',
    latest_complication_risk_score: 0.32,
    sepsis_light_prob: 0.38,
    latest_sofa_total: 6,
    active_alert_count: 0,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
  {
    stay_id: 'stay-21442',
    stay_token: 'ST-21442',
    patient_token: 'PT-21442',
    current_bed_label: 'A-06',
    age_group: '40s',
    sex: 'F',
    latest_mortality_risk_score: 0.18,
    latest_mortality_risk_label: 'low',
    latest_complication_risk_score: 0.15,
    sepsis_light_prob: 0.24,
    latest_sofa_total: 4,
    active_alert_count: 0,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
  {
    stay_id: 'stay-21508',
    stay_token: 'ST-21508',
    patient_token: 'PT-21508',
    current_bed_label: 'A-07',
    age_group: '60s',
    sex: 'M',
    latest_mortality_risk_score: 0.15,
    latest_mortality_risk_label: 'low',
    latest_complication_risk_score: 0.13,
    sepsis_light_prob: 0.18,
    latest_sofa_total: 3,
    active_alert_count: 0,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
  {
    stay_id: 'stay-21603',
    stay_token: 'ST-21603',
    patient_token: 'PT-21603',
    current_bed_label: 'A-08',
    age_group: '30s',
    sex: 'F',
    latest_mortality_risk_score: 0.11,
    latest_mortality_risk_label: 'low',
    latest_complication_risk_score: 0.10,
    sepsis_light_prob: 0.12,
    latest_sofa_total: 2,
    active_alert_count: 0,
    last_prediction_at: '2026-05-11T08:30:00Z',
    last_observation_at: '2026-05-11T08:45:00Z',
  },
];

export const mockDashboardPayload: WireDashboardResponse = {
  icu_unit: { unit_code: 'ICU_A', display_name: '내과 중환자실 A' },
  patients: dashboardPatients,
  summary: {
    total_patients: dashboardPatients.length,
    high_risk_count: dashboardPatients.filter((p) => p.latest_mortality_risk_label === 'high').length,
    critical_alert_count: dashboardPatients.reduce((sum, p) => sum + p.active_alert_count, 0),
  },
};

/** stay_token 키. /icu-stays/{stayId} 응답 모음. */
export const mockPatientDetailByStay: Record<string, WirePatientDetail> = {
  'ST-19482': {
    stay_id: 'stay-19482',
    stay_token: 'ST-19482',
    patient_token: 'PT-19482',
    age_years: 72,
    age_group: '70s',
    sex: 'M',
    admission_type: 'emergency',
    primary_diagnosis_code: 'J18.9',
    primary_diagnosis_text: '지역사회획득 폐렴, 패혈성 쇼크 의심',
    hospital_admit_at: '2026-04-21T08:14:00+09:00',
    icu_in_at: '2026-04-21T10:00:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-01',
    status: 'active',
    sepsis_onset_at: '2026-04-23T11:40:00+09:00',
  },
  'ST-20314': {
    stay_id: 'stay-20314',
    stay_token: 'ST-20314',
    patient_token: 'PT-20314',
    age_years: 64,
    age_group: '60s',
    sex: 'F',
    admission_type: 'emergency',
    primary_diagnosis_code: 'T07',
    primary_diagnosis_text: '다발성 외상 (교통사고)',
    hospital_admit_at: '2026-04-22T17:02:00+09:00',
    icu_in_at: '2026-04-22T19:30:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-02',
    status: 'active',
    sepsis_onset_at: null,
  },
  'ST-20781': {
    stay_id: 'stay-20781',
    stay_token: 'ST-20781',
    patient_token: 'PT-20781',
    age_years: 58,
    age_group: '50s',
    sex: 'M',
    admission_type: 'emergency',
    primary_diagnosis_code: 'K85.9',
    primary_diagnosis_text: '급성 췌장염',
    hospital_admit_at: '2026-04-22T21:38:00+09:00',
    icu_in_at: '2026-04-23T00:30:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-03',
    status: 'active',
    sepsis_onset_at: null,
  },
  'ST-21005': {
    stay_id: 'stay-21005',
    stay_token: 'ST-21005',
    patient_token: 'PT-21005',
    age_years: 69,
    age_group: '60s',
    sex: 'F',
    admission_type: 'planned',
    primary_diagnosis_code: 'I50.9',
    primary_diagnosis_text: '울혈성 심부전 악화',
    hospital_admit_at: '2026-04-23T06:11:00+09:00',
    icu_in_at: '2026-04-23T08:00:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-04',
    status: 'active',
    sepsis_onset_at: null,
  },
  'ST-21219': {
    stay_id: 'stay-21219',
    stay_token: 'ST-21219',
    patient_token: 'PT-21219',
    age_years: 55,
    age_group: '50s',
    sex: 'M',
    admission_type: 'post_op',
    primary_diagnosis_code: 'K65.9',
    primary_diagnosis_text: '복강 내 감염 수술 후 관찰',
    hospital_admit_at: '2026-04-23T12:47:00+09:00',
    icu_in_at: '2026-04-23T15:00:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-05',
    status: 'active',
    sepsis_onset_at: null,
  },
  'ST-21442': {
    stay_id: 'stay-21442',
    stay_token: 'ST-21442',
    patient_token: 'PT-21442',
    age_years: 47,
    age_group: '40s',
    sex: 'F',
    admission_type: 'emergency',
    primary_diagnosis_code: 'E10.1',
    primary_diagnosis_text: '당뇨성 케톤산증',
    hospital_admit_at: '2026-04-23T19:22:00+09:00',
    icu_in_at: '2026-04-23T21:00:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-06',
    status: 'active',
    sepsis_onset_at: null,
  },
  'ST-21508': {
    stay_id: 'stay-21508',
    stay_token: 'ST-21508',
    patient_token: 'PT-21508',
    age_years: 61,
    age_group: '60s',
    sex: 'M',
    admission_type: 'emergency',
    primary_diagnosis_code: 'J44.1',
    primary_diagnosis_text: 'COPD 악화 후 회복',
    hospital_admit_at: '2026-04-24T02:05:00+09:00',
    icu_in_at: '2026-04-24T04:30:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-07',
    status: 'active',
    sepsis_onset_at: null,
  },
  'ST-21603': {
    stay_id: 'stay-21603',
    stay_token: 'ST-21603',
    patient_token: 'PT-21603',
    age_years: 38,
    age_group: '30s',
    sex: 'F',
    admission_type: 'post_op',
    primary_diagnosis_code: 'K80.0',
    primary_diagnosis_text: '복강경 담낭 절제 후 관찰',
    hospital_admit_at: '2026-04-24T09:18:00+09:00',
    icu_in_at: '2026-04-24T11:30:00+09:00',
    icu_out_at: null,
    current_unit_code: 'ICU_A',
    current_bed_label: 'A-08',
    status: 'active',
    sepsis_onset_at: null,
  },
};
