/**
 * Dashboard Staffing Service
 *
 *  - GET /dashboard/icu/{icuId}/staffing → getStaffing(icuId)
 *
 * V4 명세 §2-2.
 * Phase 3 — MVP에서는 호출하지 않는다. 명세에 "2차 권장"으로 명시.
 * 핵심 예측/알림 파이프라인 완성 후 환자-의료진 매칭 KPI 도입 시 활성화.
 */
import type { DashboardStaffing, StaffingRoleCount } from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  mockDashboardStaffing,
  type WireDashboardStaffing,
} from '../mock/staffing';

const ZERO: StaffingRoleCount = { total: 0, available: 0 };

type WireRoleCount = { total?: number; available?: number };

/** 실제 API: { icu_id, staffing: { physician/nurse/admin: { total, available } } } */
interface WireStaffingByRole {
  icu_id?: string;
  staffing?: Record<string, WireRoleCount | undefined>;
}

function roleCount(w: WireRoleCount | undefined): StaffingRoleCount {
  return { total: w?.total ?? 0, available: w?.available ?? 0 };
}

/**
 * 구/mock(assignments[]) 응답에서 role별 고유 staff 수를 집계.
 * 가용 인원 정보가 없으므로 available = total 로 둔다.
 */
function deriveFromAssignments(w: WireDashboardStaffing): DashboardStaffing {
  const ids: Record<string, Set<string>> = {
    physician: new Set(),
    nurse: new Set(),
    admin: new Set(),
  };
  for (const a of w.assignments ?? []) {
    for (const s of a.assigned_staff ?? []) {
      ids[s.role]?.add(s.staff_id);
    }
  }
  const c = (r: string): StaffingRoleCount => ({ total: ids[r].size, available: ids[r].size });
  return { icuId: w.icu_unit_code ?? '', physician: c('physician'), nurse: c('nurse'), admin: c('admin') };
}

/**
 * 실제 API의 role-count 구조를 우선 사용하고, 없으면 구/mock assignments[]에서 파생한다.
 * TODO: 백엔드 뷰 전환 완료 후 assignments 폴백 제거.
 */
function mapStaffing(w: unknown): DashboardStaffing {
  const o = (w ?? {}) as WireStaffingByRole & Partial<WireDashboardStaffing>;
  if (o.staffing && typeof o.staffing === 'object') {
    const s = o.staffing;
    return {
      icuId: o.icu_id ?? '',
      physician: roleCount(s.physician),
      nurse: roleCount(s.nurse),
      admin: roleCount(s.admin),
    };
  }
  if (Array.isArray(o.assignments)) {
    return deriveFromAssignments(o as WireDashboardStaffing);
  }
  return { icuId: '', physician: ZERO, nurse: ZERO, admin: ZERO };
}

export async function getStaffing(icuId: string): Promise<DashboardStaffing> {
  if (MOCK_MODE) {
    return mapStaffing(mockDashboardStaffing);
  }
  const w = await request<unknown>(
    `/dashboard/icu/${encodeURIComponent(icuId)}/staffing`,
  );
  return mapStaffing(w);
}
