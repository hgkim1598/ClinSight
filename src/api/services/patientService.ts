/**
 * Patient Service
 *
 * - GET /dashboard/icu/{icuId}     → getDashboardPatients(icuId)
 * - GET /icu-stays/{stayId}        → getPatientDetail(stayId)
 *
 * snake_case → camelCase는 본 service에서 명시적으로 매핑한다 (client.ts에서 일괄 변환 안 함).
 */
import type {
  DashboardPatient,
  DashboardResponse,
  PatientDetail,
} from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  mockDashboardPayload,
  mockPatientDetailByStay,
  type WireDashboardPatient,
  type WireDashboardResponse,
  type WirePatientDetail,
} from '../mock/patients';

// -------- 매핑 (wire → view-model) --------

function mapDashboardPatient(w: WireDashboardPatient): DashboardPatient {
  return {
    stayId: w.stay_id,
    stayToken: w.stay_token,
    patientToken: w.patient_token,
    currentBedLabel: w.current_bed_label,
    ageGroup: w.age_group,
    sex: w.sex,
    departmentCode: w.department_code,
    attendingStaffId: w.attending_staff_id,
    hospitalAdmitAt: w.hospital_admit_at,
    surgeryAt: w.surgery_at,
    latestMortalityRiskScore: w.latest_mortality_risk_score,
    latestMortalityRiskLabel: w.latest_mortality_risk_label,
    latestComplicationRiskScore: w.latest_complication_risk_score,
    latestSofaTotal: w.latest_sofa_total,
    activeAlertCount: w.active_alert_count,
    lastPredictionAt: w.last_prediction_at,
    lastObservationAt: w.last_observation_at,
  };
}

/**
 * spec 준수 검증.
 *
 * 정책: 백엔드가 V4 spec(`{ icu_unit, patients, summary }`)을 어기면 mapper 는 절대
 * 추측해서 채우지 않는다 (예: `icu_status` → `summary` 같은 브릿지 매핑 금지).
 * spec 외 응답은 콘솔에 경고만 남기고 빈 응답으로 처리해 UI 가 빈 상태(empty state)를
 * 보여주도록 한다. 백엔드는 별도로 spec 에 맞춰 수정 배포된다는 전제.
 */
function isValidDashboardResponse(w: unknown): w is WireDashboardResponse {
  if (!w || typeof w !== 'object') return false;
  const o = w as Record<string, unknown>;
  return (
    !!o.icu_unit &&
    typeof o.icu_unit === 'object' &&
    Array.isArray(o.patients) &&
    !!o.summary &&
    typeof o.summary === 'object'
  );
}

function emptyDashboardResponse(icuId: string): DashboardResponse {
  return {
    icuUnit: { unitCode: icuId, displayName: icuId },
    patients: [],
    summary: { totalPatients: 0, highRiskCount: 0, criticalAlertCount: 0 },
  };
}

function mapDashboardResponse(w: WireDashboardResponse, icuId: string): DashboardResponse {
  if (!isValidDashboardResponse(w)) {
    const receivedKeys =
      w && typeof w === 'object' ? Object.keys(w as Record<string, unknown>) : null;
    console.warn(
      `[patientService] /dashboard/icu/${icuId} 응답이 V4 spec 과 일치하지 않습니다. ` +
        '빈 상태로 렌더링합니다. (필수 키: icu_unit, patients, summary)',
      { receivedKeys },
    );
    return emptyDashboardResponse(icuId);
  }
  return {
    icuUnit: {
      unitCode: w.icu_unit.unit_code,
      displayName: w.icu_unit.display_name,
    },
    patients: w.patients.map(mapDashboardPatient),
    summary: {
      totalPatients: w.summary.total_patients,
      highRiskCount: w.summary.high_risk_count,
      criticalAlertCount: w.summary.critical_alert_count,
    },
  };
}

/** age_years → 'NN대' 범주 (백엔드 age_group 미제공 시 폴백). */
function toAgeGroup(years: number | null | undefined): string | undefined {
  if (years == null || Number.isNaN(years)) return undefined;
  return `${Math.floor(years / 10) * 10}s`;
}

function mapPatientDetail(w: WirePatientDetail): PatientDetail {
  // 실제 API가 일부 필드를 미제공 → 내부 폴백. 시그니처는 그대로.
  // TODO: 백엔드 필드 추가 후 폴백 제거.
  return {
    stayId: w.stay_id,
    stayToken: w.stay_token,
    patientToken: w.patient_token,
    ageYears: w.age_years,
    ageGroup: w.age_group ?? toAgeGroup(w.age_years) ?? '—',
    sex: w.sex,
    admissionType: w.admission_type ?? '—',
    primaryDiagnosisCode: w.primary_diagnosis_code ?? '',
    primaryDiagnosisText: w.primary_diagnosis_text,
    hospitalAdmitAt: w.hospital_admit_at ?? '',
    icuInAt: w.icu_in_at,
    icuOutAt: w.icu_out_at,
    currentUnitCode: w.current_unit_code,
    currentBedLabel: w.current_bed_label,
    status: w.status,
    sepsisOnsetAt: w.sepsis_onset_at,
    surgeryAt: w.surgery_at,
  };
}

// -------- public API --------

/** 대시보드 정렬 파라미터 (백엔드 query string sortBy/sortOrder 로 전달). */
export interface DashboardSort {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/** GET /dashboard/icu/{icuId}?sortBy=&sortOrder= */
export async function getDashboardPatients(
  icuId: string,
  sort?: DashboardSort,
): Promise<DashboardResponse> {
  if (MOCK_MODE) {
    return mapDashboardResponse(mockDashboardPayload, icuId);
  }
  const qs = sort
    ? `?sortBy=${encodeURIComponent(sort.sortBy)}&sortOrder=${encodeURIComponent(sort.sortOrder)}`
    : '';
  const wire = await request<WireDashboardResponse>(
    `/dashboard/icu/${encodeURIComponent(icuId)}${qs}`,
  );
  return mapDashboardResponse(wire, icuId);
}

/** GET /icu-stays/{stayId} */
export async function getPatientDetail(
  stayId: string,
): Promise<PatientDetail | undefined> {
  if (MOCK_MODE) {
    const wire = mockPatientDetailByStay[stayId];
    return wire ? mapPatientDetail(wire) : undefined;
  }
  const wire = await request<WirePatientDetail>(
    `/icu-stays/${encodeURIComponent(stayId)}`,
  );
  return mapPatientDetail(wire);
}

/**
 * 호환 alias.
 * 기존 코드의 getPatients()는 대시보드 응답에서 patients 배열만 추출하는 형태로 유지.
 * 호출처를 점진 마이그레이션 후 제거 예정.
 */
export async function getPatients(): Promise<DashboardPatient[]> {
  const res = await getDashboardPatients('ICU_A');
  return res.patients;
}

/**
 * 호환 alias.
 * 기존 getPatientById(id)는 stayToken 또는 patientToken 모두 받을 수 있도록 한다.
 */
export async function getPatientById(
  idOrToken: string,
): Promise<PatientDetail | undefined> {
  // stay_token이면 바로 lookup.
  if (mockPatientDetailByStay[idOrToken]) {
    return getPatientDetail(idOrToken);
  }
  // patient_token으로 들어오면 ST-* prefix를 시도.
  const stayKey = Object.keys(mockPatientDetailByStay).find(
    (k) => mockPatientDetailByStay[k].patient_token === idOrToken,
  );
  return stayKey ? getPatientDetail(stayKey) : undefined;
}
