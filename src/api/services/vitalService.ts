/**
 * Vital / Clinical Data Service
 *
 * - GET /icu-stays/{stayId}/clinical-data → 본 service
 * - API는 flat row, 컴포넌트가 소비하는 VitalData는 pivot 구조.
 *   service의 observationsToVitalData()가 변환을 담당한다.
 */
import type {
  ClinicalObservation,
  LabDot,
  VitalData,
  VitalKey,
  VitalSeries,
} from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  emptyClinicalData,
  mockClinicalDataByStay,
  type WireClinicalDataResponse,
  type WireObservationGroup,
} from '../mock/vitals';
import { toRelativeLabel } from '../../utils/time';

// -------- 매핑 (wire → ClinicalObservation) --------
//
// 실제 API는 metric_code 별로 묶인 nested 구조:
//   observations: [{ metric_code, label, unit, normal_min, normal_max, category,
//                    data_points: [{ observed_at, value }, ...] }]
// 프론트 view-model 은 flat row (한 데이터 포인트 = 한 ClinicalObservation).
// mapClinicalData 가 group → flat 변환을 담당.

const VALID_GROUPS = new Set<'vital' | 'lab' | 'derived'>(['vital', 'lab', 'derived']);

function groupToObservations(g: WireObservationGroup): ClinicalObservation[] {
  const metricGroup: 'vital' | 'lab' | 'derived' =
    VALID_GROUPS.has(g.category) ? g.category : 'vital';
  const metricName = g.label_ko ?? g.label ?? g.metric_code;
  const points = g.data_points ?? [];
  return points.map((p, i) => ({
    observationId: `${g.metric_code}-${i}-${p.observed_at}`,
    metricGroup,
    metricCode: g.metric_code,
    metricName,
    numericValue: p.value,
    unit: g.unit ?? '',
    valueStatus: 'normal',
    normalRangeLow: g.normal_min,
    normalRangeHigh: g.normal_max,
    observedAt: p.observed_at,
    qualityFlag: 'valid',
  }));
}

interface ClinicalDataResult {
  stayToken: string;
  period: { from: string; to: string };
  observations: ClinicalObservation[];
}

function mapClinicalData(w: WireClinicalDataResponse): ClinicalDataResult {
  const observations: ClinicalObservation[] = [];
  for (const g of w.observations ?? []) {
    observations.push(...groupToObservations(g));
  }
  return {
    stayToken: w.stay_token,
    period: { ...w.period },
    observations,
  };
}

// -------- pivot 변환: flat row → VitalData --------

const VITAL_KEYS: VitalKey[] = ['hr', 'map', 'spo2', 'rr', 'temp', 'gcs', 'urine_output'];

/**
 * 백엔드 metric_code 와 프론트 차트 시리즈 키 사이의 별칭 매핑.
 * 같은 metric 을 백엔드가 다른 이름으로 보내도 차트가 인식하도록 정규화.
 * 원본 metric_code 는 ClinicalObservation.metricCode 에 그대로 보존되고,
 * 그룹핑 키만 canonical 로 변환된다.
 */
const METRIC_CODE_ALIAS: Record<string, string> = {
  resp_rate: 'rr',
  temperature: 'temp',
  bilirubin_total: 'bilirubin',
};

function canonicalMetricCode(code: string): string {
  return METRIC_CODE_ALIAS[code] ?? code;
}

/** lab metric_code → 차트 그룹 탭 분류 키 매핑 */
const LAB_TYPE_BY_METRIC: Record<string, LabDot['type']> = {
  lactate: 'lac',
  creatinine: 'cre',
  pao2_fio2: 'pf_ratio',
  platelet: 'platelet',
  bilirubin: 'bilirubin',
};

/** lab metric_code → annotation 표시 라벨 prefix 매핑 */
const LAB_LABEL_PREFIX: Record<string, string> = {
  lactate: 'Lac',
  creatinine: 'Cre',
  pao2_fio2: 'P/F',
  platelet: 'Plt',
  bilirubin: 'Bil',
};

const EMPTY_VITAL_SERIES = (label: string, unit: string, normal: [number, number]): VitalSeries => ({
  label, unit, data: [], normal, times: [], isoTimes: [],
});

const DEFAULT_NORMAL: Record<VitalKey, [number, number]> = {
  hr: [60, 100],
  map: [65, 90],
  spo2: [94, 100],
  rr: [12, 20],
  temp: [36.0, 37.5],
  gcs: [15, 15],
  urine_output: [50, 200],
};

const DEFAULT_LABEL: Record<VitalKey, { label: string; unit: string }> = {
  hr: { label: 'Heart Rate', unit: 'bpm' },
  map: { label: 'MAP', unit: 'mmHg' },
  spo2: { label: 'SpO₂', unit: '%' },
  rr: { label: 'Respiratory Rate', unit: '/min' },
  temp: { label: 'Temperature', unit: '°C' },
  gcs: { label: 'GCS', unit: '' },
  urine_output: { label: 'Urine Output', unit: 'mL/h' },
};

/**
 * flat observations → VitalData pivot 변환.
 * - vital: metric_code 별 series (data/times/normal)
 * - lab: 알려진 metric_code(LAB_TYPE_BY_METRIC)만 annotation으로 변환
 *
 * 시간 라벨은 referenceNow 기준 상대시간(`-6h`, `현재`)으로 표시.
 */
export function observationsToVitalData(
  observations: ClinicalObservation[],
  referenceNow?: string,
): VitalData {
  // series 초기화
  const series: Record<VitalKey, VitalSeries> = {
    hr: EMPTY_VITAL_SERIES(DEFAULT_LABEL.hr.label, DEFAULT_LABEL.hr.unit, DEFAULT_NORMAL.hr),
    map: EMPTY_VITAL_SERIES(DEFAULT_LABEL.map.label, DEFAULT_LABEL.map.unit, DEFAULT_NORMAL.map),
    spo2: EMPTY_VITAL_SERIES(DEFAULT_LABEL.spo2.label, DEFAULT_LABEL.spo2.unit, DEFAULT_NORMAL.spo2),
    rr: EMPTY_VITAL_SERIES(DEFAULT_LABEL.rr.label, DEFAULT_LABEL.rr.unit, DEFAULT_NORMAL.rr),
    temp: EMPTY_VITAL_SERIES(DEFAULT_LABEL.temp.label, DEFAULT_LABEL.temp.unit, DEFAULT_NORMAL.temp),
    gcs: EMPTY_VITAL_SERIES(DEFAULT_LABEL.gcs.label, DEFAULT_LABEL.gcs.unit, DEFAULT_NORMAL.gcs),
    urine_output: EMPTY_VITAL_SERIES(DEFAULT_LABEL.urine_output.label, DEFAULT_LABEL.urine_output.unit, DEFAULT_NORMAL.urine_output),
  };

  // groupBy canonical metric_code (별칭 매핑 적용), 오름차순 정렬.
  // numericValue 가 null/undefined/NaN 인 행은 차트 축 계산을 망가뜨리므로 사전에 제거.
  const byCode = new Map<string, ClinicalObservation[]>();
  for (const o of observations) {
    if (o.numericValue == null || Number.isNaN(o.numericValue)) continue;
    const key = canonicalMetricCode(o.metricCode);
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key)!.push(o);
  }
  for (const arr of byCode.values()) {
    arr.sort((a, b) => (a.observedAt ?? '').localeCompare(b.observedAt ?? ''));
  }

  // reference (가장 최근 관측 시각)
  const refIso =
    referenceNow ??
    observations
      .map((o) => o.observedAt)
      .sort()
      .pop() ??
    new Date().toISOString();

  // vital
  for (const key of VITAL_KEYS) {
    const rows = byCode.get(key);
    if (!rows || rows.length === 0) continue;
    const head = rows[0];
    series[key] = {
      label: head.metricName || DEFAULT_LABEL[key].label,
      unit: head.unit || DEFAULT_LABEL[key].unit,
      data: rows.map((r) => r.numericValue),
      times: rows.map((r) => toRelativeLabel(r.observedAt, refIso)),
      isoTimes: rows.map((r) => r.observedAt),
      normal: [
        head.normalRangeLow ?? DEFAULT_NORMAL[key][0],
        head.normalRangeHigh ?? DEFAULT_NORMAL[key][1],
      ],
    };
  }

  // lab annotation
  const labs: LabDot[] = [];
  for (const [code, type] of Object.entries(LAB_TYPE_BY_METRIC)) {
    const rows = byCode.get(code);
    if (!rows) continue;
    const prefix = LAB_LABEL_PREFIX[code] ?? code;
    for (const r of rows) {
      labs.push({
        time: toRelativeLabel(r.observedAt, refIso),
        // 표시 라벨은 정수 반올림. raw value 는 r.numericValue 로 별도 보존 (임계 비교용).
        label: `${prefix} ${Math.round(r.numericValue)}`,
        value: r.numericValue,
        type,
        metricCode: r.metricCode,
        isoTime: r.observedAt,
      });
    }
  }

  return { series, labs };
}

// -------- public API --------

/** GET /icu-stays/{stayId}/clinical-data → flat 응답 그대로 */
export async function getClinicalData(
  stayId: string,
): Promise<ClinicalDataResult> {
  if (MOCK_MODE) {
    const wire = mockClinicalDataByStay[stayId] ?? emptyClinicalData(stayId);
    return mapClinicalData(wire);
  }
  const wire = await request<WireClinicalDataResponse>(
    `/icu-stays/${encodeURIComponent(stayId)}/clinical-data`,
  );
  return mapClinicalData(wire);
}

/**
 * 컴포넌트가 소비하는 VitalData (pivot view-model) 반환.
 * service 내부에서 getClinicalData() + observationsToVitalData() 조합.
 */
export async function getVitals(stayId: string): Promise<VitalData> {
  const { observations } = await getClinicalData(stayId);
  return observationsToVitalData(observations);
}
