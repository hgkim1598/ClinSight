/**
 * Patient Report Service (조합형)
 *
 *  기본: 프론트가 여러 API를 조합해 즉석 빌드 (저장 안 함, 가볍고 빠름)
 *  저장: POST /icu-stays/{stayId}/reports → ReportLambda가 S3에 PDF/HTML 저장
 *  조회: GET /icu-stays/{stayId}/report/latest → presigned URL
 *
 * V4 명세 §7.
 */
import type {
  ModelKey,
  PatientReport,
  ReportLabRow,
  ReportPrediction,
  ReportVitalRow,
  SavedReport,
  VitalKey,
  VitalStatusLevel,
} from '../../types';
import { getPatientDetail } from './patientService';
import { getClinicalData, observationsToVitalData } from './vitalService';
import { getModelPredictions } from './modelService';
import { MOCK_MODE, request } from '../client';
import { toRelativeLabel } from '../../utils/time';

/** 활력징후 상태 등급 산정 (mock heuristic — 백엔드 value_status로 대체될 자리). */
function computeVitalStatus(value: number, [lo, hi]: [number, number]): VitalStatusLevel {
  if (value >= lo && value <= hi) return 'normal';
  const range = hi - lo;
  if (range <= 0) return 'attention';
  const distance = value < lo ? lo - value : value - hi;
  return distance / range > 0.2 ? 'critical' : 'attention';
}

const VITAL_KEYS: VitalKey[] = ['hr', 'map', 'spo2', 'rr', 'temp'];
const MODEL_ORDER: ModelKey[] = ['mortality', 'aki', 'ards', 'sic', 'shock'];

function formatLabValue(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

/** 보고서에 노출할 검사 항목 — clinical-data 관측치의 metric_code로 매칭. */
const TARGET_LABS: Array<{
  label: string;
  metricCode: string;
  normalRange: string;
}> = [
  { label: 'Lactate', metricCode: 'lactate', normalRange: '0.5–2.2 mmol/L' },
  { label: 'Creatinine', metricCode: 'creatinine', normalRange: '0.6–1.3 mg/dL' },
  { label: 'Platelet', metricCode: 'platelet', normalRange: '150–400 x10³/µL' },
  { label: 'PaO2/FiO2', metricCode: 'pao2_fio2', normalRange: '> 400' },
];

/**
 * 환자 상태 요약 보고서 데이터를 조합한다 (프론트 BFF 방식).
 * 저장 흐름은 saveReport()를 별도로 호출.
 */
export async function getPatientReport(stayId: string): Promise<PatientReport | null> {
  const patient = await getPatientDetail(stayId);
  if (!patient) return null;

  const [clinical, predictionsData] = await Promise.all([
    getClinicalData(stayId),
    getModelPredictions(stayId),
  ]);
  // clinical-data 한 번 호출로 vitals + labs 둘 다 산출 (추가 호출 없음).
  const vitalsData = observationsToVitalData(clinical.observations);

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

  // labs: 예측 raw(실제 모드 미결선) 대신 clinical-data 관측치에서 lab metric별 최신값 사용.
  const observations = clinical.observations;
  const labRefIso =
    observations.map((o) => o.observedAt).sort().pop() ?? new Date().toISOString();
  const labs: ReportLabRow[] = TARGET_LABS.flatMap((target) => {
    const rows = observations.filter(
      (o) =>
        o.metricCode === target.metricCode &&
        o.numericValue != null &&
        !Number.isNaN(o.numericValue),
    );
    if (rows.length === 0) return [];
    const latest = rows.reduce((a, b) => (a.observedAt >= b.observedAt ? a : b));
    return [
      {
        label: target.label,
        value: formatLabValue(latest.numericValue),
        unit: latest.unit,
        time: toRelativeLabel(latest.observedAt, labRefIso),
        normalRange: target.normalRange,
      },
    ];
  });

  const predictions: ReportPrediction[] = MODEL_ORDER.map((key) => {
    const pred = predictionsData[key];
    const trendLast = pred.trend[pred.trend.length - 1];
    // riskScorePct(서비스 매핑) 우선, 없으면 trend 마지막 값, 둘 다 없으면 null.
    const probability = pred.riskScorePct ?? trendLast?.pct ?? null;
    return {
      key,
      title: pred.title,
      probability,
      risk: pred.riskLabel ?? null,
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

// -------- 저장된 보고서 (presigned URL) --------

interface WireSavedReport {
  report_id: string;
  stay_token: string;
  report_type: string;
  report_title: string;
  report_status: string;
  generated_at: string;
  generated_by_staff_id: string;
  available_formats: Array<'html' | 'pdf'>;
  html_download_url: string;
  pdf_download_url: string;
}

function mapSavedReport(w: WireSavedReport): SavedReport {
  return {
    reportId: w.report_id,
    stayToken: w.stay_token,
    reportType: w.report_type,
    reportTitle: w.report_title,
    reportStatus: w.report_status,
    generatedAt: w.generated_at,
    generatedByStaffId: w.generated_by_staff_id,
    availableFormats: w.available_formats,
    htmlDownloadUrl: w.html_download_url,
    pdfDownloadUrl: w.pdf_download_url,
  };
}

export async function getLatestSavedReport(stayId: string): Promise<SavedReport | null> {
  if (MOCK_MODE) return null;
  try {
    const w = await request<WireSavedReport>(
      `/icu-stays/${encodeURIComponent(stayId)}/report/latest`,
    );
    return mapSavedReport(w);
  } catch {
    return null;
  }
}

export interface SaveReportPayload {
  reportType: 'daily' | 'ai_assisted' | string;
  reportTitle: string;
  observationRange: { from: string; to: string };
  includePredictions?: boolean;
  includeAiSummary?: boolean;
}

export async function saveReport(
  stayId: string,
  payload: SaveReportPayload,
): Promise<SavedReport | null> {
  if (MOCK_MODE) {
    // mock 모드에서는 저장 시뮬레이션만.
    return null;
  }
  const body = JSON.stringify({
    report_type: payload.reportType,
    report_title: payload.reportTitle,
    observation_range: payload.observationRange,
    include_predictions: payload.includePredictions,
    include_ai_summary: payload.includeAiSummary,
  });
  const w = await request<WireSavedReport>(
    `/icu-stays/${encodeURIComponent(stayId)}/reports`,
    { method: 'POST', body },
  );
  return mapSavedReport(w);
}
