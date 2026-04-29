import type {
  ConsultPriority,
  ConsultRecipient,
  ConsultationRequest,
  Department,
} from '../../types';
import { mockDepartments } from '../mock/departments';
import { mockConsultations } from '../mock/consultations';

/**
 * 협진 요청 서비스.
 * 백엔드 연결 시 이 파일의 함수 본문만 fetch 호출로 교체.
 */

/** 부서/인원 트리 — 협진 요청 모달의 수신자 선택용 */
export function getDepartments(): Department[] {
  return mockDepartments;
}

/**
 * 협진 요청 내역. patientId가 있으면 해당 환자 건만, 없으면 전체.
 * 나중에 GET /consultations[?patientId=] 로 교체.
 */
export function getConsultations(patientId?: string): ConsultationRequest[] {
  if (patientId) {
    return mockConsultations.filter((c) => c.patientId === patientId);
  }
  return mockConsultations;
}

/**
 * 협진 요청 생성. 나중에 POST /consultations 로 교체.
 * 현재는 mock 배열 직접 변경(임시).
 */
export function createConsultation(request: {
  patientId: string;
  patientName: string;
  patientBed: string;
  recipients: ConsultRecipient[];
  priority: ConsultPriority;
  reason: string;
}): ConsultationRequest {
  const newConsult: ConsultationRequest = {
    id: `consult-${Date.now()}`,
    ...request,
    requestedBy: '담당 의료진',
    requestedAt: new Date().toLocaleString('ko-KR'),
    status: 'pending',
  };
  mockConsultations.unshift(newConsult);
  return newConsult;
}
