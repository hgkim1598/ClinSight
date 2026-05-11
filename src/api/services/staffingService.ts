/**
 * Dashboard Staffing Service
 *
 *  - GET /dashboard/icu/{icuId}/staffing → getStaffing(icuId)
 *
 * V4 명세 §2-2.
 * Phase 3 — MVP에서는 호출하지 않는다. 명세에 "2차 권장"으로 명시.
 * 핵심 예측/알림 파이프라인 완성 후 환자-의료진 매칭 KPI 도입 시 활성화.
 */
import type {
  AssignedStaff,
  DashboardStaffing,
  PatientAssignment,
} from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  mockDashboardStaffing,
  type WireAssignedStaff,
  type WireAssignment,
  type WireDashboardStaffing,
} from '../mock/staffing';

function mapStaff(w: WireAssignedStaff): AssignedStaff {
  return { staffId: w.staff_id, displayName: w.display_name, role: w.role };
}

function mapAssignment(w: WireAssignment): PatientAssignment {
  return {
    stayToken: w.stay_token,
    patientToken: w.patient_token,
    currentBedLabel: w.current_bed_label,
    assignedStaff: w.assigned_staff.map(mapStaff),
  };
}

function mapStaffing(w: WireDashboardStaffing): DashboardStaffing {
  return {
    icuUnitCode: w.icu_unit_code,
    assignments: w.assignments.map(mapAssignment),
    summary: {
      totalPatients: w.summary.total_patients,
      myPatientsCount: w.summary.my_patients_count,
      unassignedCount: w.summary.unassigned_count,
    },
  };
}

export async function getStaffing(icuId: string): Promise<DashboardStaffing> {
  if (MOCK_MODE) {
    return mapStaffing(mockDashboardStaffing);
  }
  const w = await request<WireDashboardStaffing>(
    `/dashboard/icu/${encodeURIComponent(icuId)}/staffing`,
  );
  return mapStaffing(w);
}
