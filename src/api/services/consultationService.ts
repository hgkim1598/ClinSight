/**
 * Consultation / Department / Staff Service
 *
 *  - GET  /staff/departments        → getDepartments()
 *  - GET  /staff?department_code=&role=  → getStaff()
 *  - GET  /consultations[?stay_token=&status=]  → getConsultations()
 *  - GET  /consultations/{id}        → getConsultationDetail()
 *  - POST /consultations             → createConsultation()
 *  - PATCH /consultations/{id}/status → updateConsultationStatus()
 *
 * 부서별 의료진은 별도 endpoint(/staff)로 조회. mock Department.members 임베드 폐기.
 */
import type {
  ConsultPriority,
  ConsultRecipient,
  ConsultStatus,
  ConsultationDetail,
  ConsultationRequest,
  Department,
  StaffMember,
} from '../../types';
import { MOCK_MODE, request } from '../client';
import { mockDepartments, type WireDepartment } from '../mock/departments';
import { mockStaff, type WireStaff } from '../mock/staff';
import {
  mockConsultations,
  type WireConsultation,
  type WireRecipient,
} from '../mock/consultations';

// -------- 매핑 --------

function mapDepartment(w: WireDepartment): Department {
  // 실제 API는 department_code 로 내려줌 — config_key 우선, 없으면 폴백.
  // configKey 가 비면 아코디언 키가 충돌(전체 동시 열림)하고 getStaff 필터도 깨짐.
  // TODO: 백엔드 필드 통일 후 폴백 제거.
  return {
    configKey: w.config_key ?? w.department_code ?? '',
    displayName: w.display_name,
    sortOrder: w.sort_order,
  };
}

/** 구 mock status('active'/'off_duty') → duty_status 로 환산 (실제 API duty_status 없을 때 폴백). */
function legacyStatusToDuty(status: string | undefined): string {
  if (status === 'active') return 'on_duty';
  if (status === 'off_duty') return 'off';
  return status ?? 'off';
}

function mapStaff(w: WireStaff): StaffMember {
  // 실제 API는 department_code / duty_status 로 내려줌 — 기존 필드 우선, 없으면 폴백.
  // TODO: 백엔드 필드 통일 후 폴백 제거.
  return {
    staffId: w.staff_id,
    displayName: w.display_name,
    role: w.role,
    primaryDepartmentCode: w.primary_department_code ?? w.department_code ?? '',
    dutyStatus: w.duty_status ?? legacyStatusToDuty(w.status),
  };
}

function mapRecipient(w: WireRecipient): ConsultRecipient {
  return {
    staffId: w.staff_id,
    departmentCode: w.department_code,
    role: w.role,
  };
}

/** API priority(예: 'normal') → 프론트 enum. 'urgent'만 urgent, 그 외(normal/routine 등)는 routine. */
function mapPriority(p: string | undefined): ConsultPriority {
  return p === 'urgent' ? 'urgent' : 'routine';
}

function mapConsultation(w: WireConsultation): ConsultationRequest {
  // 실제 API가 일부 필드를 누락/다른 이름으로 보냄(stay_token→stay_id, recipients_jsonb 없음 등).
  // 누락 시 기본값으로 방어 — recipients_jsonb 누락 시 .map throw 방지가 핵심.
  // TODO: 백엔드 필드 통일 후 폴백 제거.
  return {
    consultationId: w.consultation_id,
    stayToken: w.stay_token ?? w.stay_id ?? '',
    subject: w.subject,
    priority: mapPriority(w.priority),
    status: w.status,
    requesterStaffId: w.requester_staff_id ?? '',
    requesterDepartmentCode: w.requester_department_code ?? '',
    recipients: (w.recipients_jsonb ?? []).map(mapRecipient),
    attachedReportId: w.attached_report_id ?? null,
    createdAt: w.created_at,
  };
}

function mapConsultationDetail(w: WireConsultation): ConsultationDetail {
  return {
    ...mapConsultation(w),
    message: w.message ?? '',
    notes: [],
    statusHistory: [],
    updatedAt: w.updated_at ?? '',
  };
}

// -------- public API --------

export async function getDepartments(): Promise<Department[]> {
  if (MOCK_MODE) {
    return mockDepartments.map(mapDepartment).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const w = await request<{ departments: WireDepartment[] }>('/staff/departments');
  return w.departments.map(mapDepartment);
}

export async function getStaff(
  departmentCode?: string,
  role?: string,
): Promise<StaffMember[]> {
  if (MOCK_MODE) {
    let list = mockStaff;
    if (departmentCode) {
      list = list.filter((s) => s.primary_department_code === departmentCode);
    }
    if (role) {
      list = list.filter((s) => s.role === role);
    }
    return list.map(mapStaff);
  }
  const qs = new URLSearchParams();
  if (departmentCode) qs.set('department_code', departmentCode);
  if (role) qs.set('role', role);
  const path = `/staff${qs.toString() ? `?${qs.toString()}` : ''}`;
  const w = await request<{ staff: WireStaff[] }>(path);
  return w.staff.map(mapStaff);
}

export async function getConsultations(
  filter?: { stayToken?: string; status?: ConsultStatus },
): Promise<ConsultationRequest[]> {
  if (MOCK_MODE) {
    let list = mockConsultations;
    if (filter?.stayToken) list = list.filter((c) => c.stay_token === filter.stayToken);
    if (filter?.status) list = list.filter((c) => c.status === filter.status);
    return list.map(mapConsultation);
  }
  const qs = new URLSearchParams();
  if (filter?.stayToken) qs.set('stay_token', filter.stayToken);
  if (filter?.status) qs.set('status', filter.status);
  const path = `/consultations${qs.toString() ? `?${qs.toString()}` : ''}`;
  const w = await request<{ consultations: WireConsultation[] }>(path);
  return w.consultations.map(mapConsultation);
}

export async function getConsultationDetail(
  consultationId: string,
): Promise<ConsultationDetail | null> {
  if (MOCK_MODE) {
    const w = mockConsultations.find((c) => c.consultation_id === consultationId);
    return w ? mapConsultationDetail(w) : null;
  }
  const w = await request<WireConsultation>(
    `/consultations/${encodeURIComponent(consultationId)}`,
  );
  return mapConsultationDetail(w);
}

export interface CreateConsultationPayload {
  stayToken: string;
  subject: string;
  message: string;
  priority: ConsultPriority;
  recipients: Array<{ departmentCode: string; staffId?: string | null; role: 'to' | 'cc' }>;
  attachedReportId?: string | null;
}

export async function createConsultation(
  payload: CreateConsultationPayload,
): Promise<ConsultationRequest | null> {
  if (MOCK_MODE) {
    const wire: WireConsultation = {
      consultation_id: `consult-${Date.now()}`,
      stay_token: payload.stayToken,
      subject: payload.subject,
      message: payload.message,
      priority: payload.priority,
      status: 'requested',
      requester_staff_id: 'staff-010',
      requester_department_code: 'icu',
      recipients_jsonb: payload.recipients.map((r) => ({
        department_code: r.departmentCode,
        staff_id: r.staffId ?? null,
        role: r.role,
      })),
      attached_report_id: payload.attachedReportId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockConsultations.unshift(wire);
    return mapConsultation(wire);
  }
  // 백엔드는 camelCase 컨벤션 (snake 로 보내면 "stayId and subject are required" 400).
  // stayId 값은 payload.stayToken(UUID) 그대로 사용.
  const body = JSON.stringify({
    stayId: payload.stayToken,
    subject: payload.subject,
    message: payload.message,
    priority: payload.priority,
    recipients: payload.recipients.map((r) => ({
      departmentCode: r.departmentCode,
      staffId: r.staffId ?? null,
      role: r.role,
    })),
    attachedReportId: payload.attachedReportId ?? null,
  });
  await request<{ consultation_id: string; status: string; created_at: string }>(
    '/consultations',
    { method: 'POST', body },
  );
  // POST 성공이 본질. 목록 재조회는 편의용 — 실패해도 생성은 성공이므로 throw 하지 않는다.
  try {
    const all = await getConsultations({ stayToken: payload.stayToken });
    return all[0] ?? null;
  } catch (e) {
    // TODO: 프로덕션 정리 시 console.warn 제거.
    console.warn('[consultationService] 협진 생성 후 목록 재조회 실패(POST 자체는 성공):', e);
    return null;
  }
}

export async function updateConsultationStatus(
  consultationId: string,
  status: ConsultStatus,
  note?: string,
): Promise<void> {
  if (MOCK_MODE) {
    const w = mockConsultations.find((c) => c.consultation_id === consultationId);
    if (w) {
      w.status = status;
      w.updated_at = new Date().toISOString();
    }
    void note;
    return;
  }
  await request<{ consultation_id: string; status: string; updated_at: string }>(
    `/consultations/${encodeURIComponent(consultationId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    },
  );
}
