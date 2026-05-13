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

function mapDashboardResponse(w: WireDashboardResponse): DashboardResponse {
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

function mapPatientDetail(w: WirePatientDetail): PatientDetail {
  return {
    stayId: w.stay_id,
    stayToken: w.stay_token,
    patientToken: w.patient_token,
    ageYears: w.age_years,
    ageGroup: w.age_group,
    sex: w.sex,
    admissionType: w.admission_type,
    primaryDiagnosisCode: w.primary_diagnosis_code,
    primaryDiagnosisText: w.primary_diagnosis_text,
    hospitalAdmitAt: w.hospital_admit_at,
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

/** GET /dashboard/icu/{icuId} */
export async function getDashboardPatients(
  icuId: string,
): Promise<DashboardResponse> {
  if (MOCK_MODE) {
    return mapDashboardResponse(mockDashboardPayload);
  }
  const wire = await request<WireDashboardResponse>(
    `/dashboard/icu/${encodeURIComponent(icuId)}`,
  );
  return mapDashboardResponse(wire);
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
