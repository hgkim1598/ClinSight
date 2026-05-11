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
  type WireObservation,
} from '../mock/vitals';
import { toRelativeLabel } from '../../utils/time';

// -------- 매핑 (wire → ClinicalObservation) --------

function mapObservation(w: WireObservation): ClinicalObservation {
  return {
    observationId: w.observation_id,
    metricGroup: w.metric_group,
    metricCode: w.metric_code,
    metricName: w.metric_name,
    numericValue: w.numeric_value,
    unit: w.unit,
    valueStatus: w.value_status,
    normalRangeLow: w.normal_range_low,
    normalRangeHigh: w.normal_range_high,
    observedAt: w.observed_at,
    qualityFlag: w.quality_flag,
  };
}

interface ClinicalDataResult {
  stayToken: string;
  period: { from: string; to: string };
  observations: ClinicalObservation[];
}

function mapClinicalData(w: WireClinicalDataResponse): ClinicalDataResult {
  return {
    stayToken: w.stay_token,
    period: { ...w.period },
    observations: w.observations.map(mapObservation),
  };
}

// -------- pivot 변환: flat row → VitalData --------

const VITAL_KEYS: VitalKey[] = ['hr', 'map', 'spo2', 'rr', 'temp', 'gcs', 'urine_output'];

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
  label, unit, data: [], normal, times: [],
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

  // groupBy metric_code, 오름차순 정렬
  const byCode = new Map<string, ClinicalObservation[]>();
  for (const o of observations) {
    if (!byCode.has(o.metricCode)) byCode.set(o.metricCode, []);
    byCode.get(o.metricCode)!.push(o);
  }
  for (const arr of byCode.values()) {
    arr.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
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
        label: `${prefix} ${r.numericValue}`,
        value: r.numericValue,
        type,
        metricCode: r.metricCode,
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
