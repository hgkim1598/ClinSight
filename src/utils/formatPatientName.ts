import { PATIENT_NAMES, STAFF_NAMES } from '../api/mock/patientNames';

/**
 * 환자 토큰(patient_token, e.g. "PT-19482")을 표시용 이름으로 변환한다.
 * V4 API는 PHI 정책상 환자 실명을 응답에 포함하지 않으므로 (§0.8)
 * 화면 표시 단계에서만 매칭한다. 매칭 실패 시 token을 그대로 반환.
 *
 * Phase 2: Hospital-Sim VPC 매칭 서비스 호출로 대체.
 */
export function formatPatientName(patientToken: string | undefined | null): string {
  if (!patientToken) return '';
  return PATIENT_NAMES[patientToken] ?? patientToken;
}

/**
 * staff_id를 표시명으로 변환. /staff 응답이 들어오면 그쪽 결과로 우선 매칭.
 */
export function formatStaffName(staffId: string | undefined | null): string {
  if (!staffId) return '';
  return STAFF_NAMES[staffId] ?? staffId;
}
