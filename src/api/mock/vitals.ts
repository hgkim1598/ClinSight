/**
 * GET /icu-stays/{stayId}/clinical-data 응답을 모사한 mock.
 *
 * V4 API는 flat row 구조(`observations: [{ metric_code, numeric_value, observed_at, ... }]`).
 * 프론트 view-model(VitalData)은 service 레이어에서 pivot 변환되어 컴포넌트에 전달된다.
 *
 * 본 파일은 service 변환 로직을 같은 입력으로 테스트할 수 있도록
 * wire 응답 모양 그대로(snake_case JSON 키) 작성한다.
 */

export interface WireObservation {
  observation_id: string;
  metric_group: 'vital' | 'lab' | 'derived';
  /** API metric_code 풀네임 (lactate, creatinine, pao2_fio2 등) */
  metric_code: string;
  metric_name: string;
  numeric_value: number;
  unit: string;
  value_status: 'normal' | 'low' | 'high' | 'abnormal' | string;
  normal_range_low: number | null;
  normal_range_high: number | null;
  observed_at: string;
  quality_flag: string;
}

export interface WireClinicalDataResponse {
  stay_token: string;
  period: { from: string; to: string };
  observations: WireObservation[];
}

const REFERENCE_NOW = '2026-05-11T08:45:00+09:00';
const HOUR_MS = 3600_000;

function isoOffsetHours(hours: number): string {
  const ref = new Date(REFERENCE_NOW).getTime();
  return new Date(ref - hours * HOUR_MS).toISOString();
}

interface VitalSpec {
  metricCode: string;
  metricName: string;
  unit: string;
  normalLow: number;
  normalHigh: number;
  /** 24h-old → now 순서 13개 값 */
  data: number[];
}

const PT19482_VITALS: VitalSpec[] = [
  {
    metricCode: 'hr', metricName: 'Heart Rate', unit: 'bpm',
    normalLow: 60, normalHigh: 100,
    data: [82, 84, 86, 88, 90, 92, 95, 98, 102, 104, 106, 108, 107],
  },
  {
    metricCode: 'map', metricName: 'MAP', unit: 'mmHg',
    normalLow: 65, normalHigh: 90,
    data: [78, 76, 74, 72, 70, 68, 66, 65, 62, 60, 59, 58, 58],
  },
  {
    metricCode: 'spo2', metricName: 'SpO2', unit: '%',
    normalLow: 94, normalHigh: 100,
    data: [97, 97, 96, 96, 95, 95, 94, 94, 93, 92, 92, 91, 91],
  },
  {
    metricCode: 'rr', metricName: 'Respiratory Rate', unit: '/min',
    normalLow: 12, normalHigh: 20,
    data: [18, 19, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 28],
  },
  {
    metricCode: 'temp', metricName: 'Temperature', unit: '°C',
    normalLow: 36.0, normalHigh: 37.5,
    data: [37.2, 37.4, 37.6, 37.8, 38.0, 38.2, 38.4, 38.6, 38.7, 38.8, 38.9, 38.9, 38.9],
  },
  {
    metricCode: 'gcs', metricName: 'GCS', unit: '',
    normalLow: 15, normalHigh: 15,
    data: [15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9],
  },
  {
    metricCode: 'urine_output', metricName: 'Urine Output', unit: 'mL/h',
    normalLow: 50, normalHigh: 200,
    data: [120, 110, 95, 80, 75, 60, 55, 45, 40, 35, 30, 25, 20],
  },
];

const VITAL_HOURS = [-24, -22, -20, -18, -16, -14, -12, -10, -8, -6, -4, -2, 0];

function buildVitalObservations(stayToken: string): WireObservation[] {
  const out: WireObservation[] = [];
  let i = 0;
  for (const v of PT19482_VITALS) {
    for (let h = 0; h < VITAL_HOURS.length; h++) {
      out.push({
        observation_id: `obs-${stayToken}-${v.metricCode}-${h}`,
        metric_group: 'vital',
        metric_code: v.metricCode,
        metric_name: v.metricName,
        numeric_value: v.data[h],
        unit: v.unit,
        value_status:
          v.data[h] >= v.normalLow && v.data[h] <= v.normalHigh
            ? 'normal'
            : v.data[h] < v.normalLow
              ? 'low'
              : 'high',
        normal_range_low: v.normalLow,
        normal_range_high: v.normalHigh,
        observed_at: isoOffsetHours(-VITAL_HOURS[h]),
        quality_flag: 'valid',
      });
      i++;
    }
  }
  void i;
  return out;
}

// labs — drop point 시계열 (annotation용)
interface LabSpec {
  metricCode: string;
  metricName: string;
  unit: string;
  normalLow: number;
  normalHigh: number;
  /** [hoursAgo, value] */
  points: Array<[number, number]>;
}

const PT19482_LABS: LabSpec[] = [
  {
    metricCode: 'lactate', metricName: 'Lactate', unit: 'mmol/L',
    normalLow: 0.5, normalHigh: 2.0,
    points: [[18, 2.1], [12, 3.4], [6, 4.6], [0, 5.2]],
  },
  {
    metricCode: 'creatinine', metricName: 'Creatinine', unit: 'mg/dL',
    normalLow: 0.6, normalHigh: 1.3,
    points: [[12, 1.6], [2, 2.1]],
  },
  {
    metricCode: 'pao2_fio2', metricName: 'PaO2/FiO2', unit: '',
    normalLow: 400, normalHigh: 500,
    points: [[20, 380], [14, 310], [8, 245], [3, 198]],
  },
  {
    metricCode: 'platelet', metricName: 'Platelet', unit: 'x10^3/µL',
    normalLow: 150, normalHigh: 400,
    points: [[22, 185], [10, 142], [2, 98]],
  },
  {
    metricCode: 'bilirubin', metricName: 'Bilirubin', unit: 'mg/dL',
    normalLow: 0.2, normalHigh: 1.2,
    points: [[20, 1.0], [8, 1.8], [1, 2.4]],
  },
];

function buildLabObservations(stayToken: string): WireObservation[] {
  const out: WireObservation[] = [];
  for (const lab of PT19482_LABS) {
    for (let i = 0; i < lab.points.length; i++) {
      const [hoursAgo, val] = lab.points[i];
      out.push({
        observation_id: `obs-${stayToken}-${lab.metricCode}-${i}`,
        metric_group: 'lab',
        metric_code: lab.metricCode,
        metric_name: lab.metricName,
        numeric_value: val,
        unit: lab.unit,
        value_status:
          val >= lab.normalLow && val <= lab.normalHigh
            ? 'normal'
            : val < lab.normalLow ? 'low' : 'high',
        normal_range_low: lab.normalLow,
        normal_range_high: lab.normalHigh,
        observed_at: isoOffsetHours(hoursAgo),
        quality_flag: 'valid',
      });
    }
  }
  return out;
}

const pt19482Observations: WireObservation[] = [
  ...buildVitalObservations('ST-19482'),
  ...buildLabObservations('ST-19482'),
];

/** stay_token 키. /clinical-data 응답 모음. */
export const mockClinicalDataByStay: Record<string, WireClinicalDataResponse> = {
  'ST-19482': {
    stay_token: 'ST-19482',
    period: { from: isoOffsetHours(24), to: REFERENCE_NOW },
    observations: pt19482Observations,
  },
};

export const emptyClinicalData = (stayToken: string): WireClinicalDataResponse => ({
  stay_token: stayToken,
  period: { from: isoOffsetHours(24), to: REFERENCE_NOW },
  observations: [],
});
