/**
 * Consultation Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/consultations.ts + departments.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /staff/departments  (Departments + Staff GSI join)
 *      - GET /consultations[?patientId=]
 *      - POST /consultations
 *
 * 참고: docs/DYNAMO_SCHEMA.md §13 Departments + §14 Staff + §15 Consultations
 */
import type {
  ConsultPriority,
  ConsultRecipient,
  ConsultationRequest,
  Department,
} from '../../types';
import { mockDepartments } from '../mock/departments';
import { mockConsultations } from '../mock/consultations';
import { CURRENT_USER } from '../../utils/constants';

/** 부서/인원 트리 — 협진 요청 모달의 수신자 선택용 */
export async function getDepartments(): Promise<Department[]> {
  return mockDepartments;
}

/**
 * 협진 요청 내역. patientId가 있으면 해당 환자 건만, 없으면 전체.
 * 나중에 GET /consultations[?patientId=] 로 교체.
 */
export async function getConsultations(
  patientId?: string,
): Promise<ConsultationRequest[]> {
  if (patientId) {
    return mockConsultations.filter((c) => c.patientId === patientId);
  }
  return mockConsultations;
}

/**
 * 협진 요청 생성. 나중에 POST /consultations 로 교체.
 */
export async function createConsultation(request: {
  patientId: string;
  patientName: string;
  patientBed: string;
  recipients: ConsultRecipient[];
  priority: ConsultPriority;
  reason: string;
}): Promise<ConsultationRequest> {
  // TODO: API 전환 시 POST /consultations로 교체하고 mock mutation 제거
  const newConsult: ConsultationRequest = {
    id: `consult-${Date.now()}`,
    ...request,
    requestedBy: CURRENT_USER,
    // TODO: API 전환 시 ISO 8601 문자열로 교체. 표시용 변환은 utils/time.ts의 formatDateTime() 사용.
    requestedAt: new Date().toLocaleString('ko-KR'),
    status: 'pending',
  };
  mockConsultations.unshift(newConsult);
  return newConsult;
}
