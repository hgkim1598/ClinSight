import type {
  ModelKey,
  PatientReport,
  ReportLabRow,
  ReportPrediction,
  ReportVitalRow,
  RiskLevel,
  RiskTone,
  VitalKey,
  VitalStatusLevel,
} from '../../types';
import { getPatientById } from './patientService';
import { getVitals } from './vitalService';
import { getModelPredictions } from './modelService';

/**
 * 활력징후 상태 등급 산정 (mock heuristic).
 * - in-range: normal
 * - 범위 밖이지만 범위 폭의 20% 이내 일탈: attention
 * - 그 이상: critical
 * 임상 정확도가 아닌 시연용 휴리스틱이며, 실제 임계치는 임상 정책 기반 별도 테이블로 대체될 자리.
 */
function computeVitalStatus(value: number, [lo, hi]: [number, number]): VitalStatusLevel {
  if (value >= lo && value <= hi) return 'normal';
  const range = hi - lo;
  if (range <= 0) return 'attention';
  const distance = value < lo ? lo - value : value - hi;
  return distance / range > 0.2 ? 'critical' : 'attention';
}

const VITAL_KEYS: VitalKey[] = ['hr', 'map', 'spo2', 'rr', 'temp'];

const MODEL_ORDER: ModelKey[] = ['mortality', 'aki', 'ards', 'sic', 'shock'];

/** 보고서에 노출할 검사 항목과 출처(predictions의 어느 모델 raw에서 가져올지). */
const TARGET_LABS: Array<{
  label: string;
  source: ModelKey;
  metric: string;
  normalRange: string;
}> = [
  { label: 'Lactate', source: 'shock', metric: 'Lactate', normalRange: '0.5–2.2 mmol/L' },
  { label: 'Creatinine', source: 'aki', metric: 'Creatinine', normalRange: '0.6–1.3 mg/dL' },
  { label: 'Platelet', source: 'sic', metric: 'Platelet', normalRange: '150–400 x10³/µL' },
  { label: 'PaO2/FiO2', source: 'ards', metric: 'PaO2/FiO2', normalRange: '> 400' },
];

function toneToRisk(tone: RiskTone): RiskLevel {
  if (tone === 'danger') return 'high';
  if (tone === 'warn') return 'med';
  return 'low';
}

function toneFallbackPct(tone: RiskTone): number {
  if (tone === 'danger') return 72;
  if (tone === 'warn') return 45;
  return 18;
}

/**
 * 환자 상태 요약 보고서 데이터를 조합한다.
 * 추후 백엔드 연결 시 GET /patients/{id}/report 같은 엔드포인트 호출로 교체될 자리.
 */
export function getPatientReport(patientId: string): PatientReport | null {
  const patient = getPatientById(patientId);
  if (!patient) return null;

  const vitalsData = getVitals(patientId);
  const predictionsData = getModelPredictions(patientId);

  const vitals: ReportVitalRow[] = VITAL_KEYS.map((key) => {
    const series = vitalsData.series[key];
    const data = series.data;
    const times = series.times;
    if (data.length === 0) {
      return {
        key,
        label: series.label,
        unit: series.unit,
        latestValue: null,
        latestTime: null,
        normalRange: series.normal,
        status: 'normal',
      };
    }
    const latestValue = data[data.length - 1];
    const latestTime = times[times.length - 1] ?? null;
    return {
      key,
      label: series.label,
      unit: series.unit,
      latestValue,
      latestTime,
      normalRange: series.normal,
      status: computeVitalStatus(latestValue, series.normal),
    };
  });

  const labs: ReportLabRow[] = TARGET_LABS.flatMap((target) => {
    const sourceRaw = predictionsData[target.source]?.raw ?? [];
    const match = sourceRaw.find((m) => m.label === target.metric);
    if (!match) return [];
    return [
      {
        label: target.label,
        value: match.value,
        unit: match.unit,
        time: match.time,
        normalRange: target.normalRange,
      },
    ];
  });

  const predictions: ReportPrediction[] = MODEL_ORDER.map((key) => {
    const pred = predictionsData[key];
    const trendLast = pred.trend[pred.trend.length - 1];
    const probability = trendLast ? trendLast.pct : toneFallbackPct(pred.tone);
    return {
      key,
      title: pred.title,
      probability,
      risk: toneToRisk(pred.tone),
    };
  });

  return {
    patient,
    generatedAt: new Date(),
    vitals,
    labs,
    predictions,
  };
}
