/**
 * GET /dashboard/icu/{icuId}/staffing 응답을 모사한 mock.
 *
 * V4 명세 §2-2 — 환자별 담당 의료진(physician/nurse) 매칭 + 운영 KPI.
 * OverviewPage의 KPI 카드(담당 의사 / 담당 간호사)에 사용된다.
 *
 *  - assignments[].assigned_staff에서 role 별로 staff_id 중복 제거하여 unique 인원 집계
 *  - summary.my_patients_count는 현재 사용자가 담당 중인 환자 수 (Phase 2 — Cognito 연동 시 활성화)
 */

export interface WireAssignedStaff {
  staff_id: string;
  display_name: string;
  role: string;
}

export interface WireAssignment {
  stay_token: string;
  patient_token: string;
  current_bed_label: string;
  assigned_staff: WireAssignedStaff[];
}

export interface WireDashboardStaffing {
  icu_unit_code: string;
  assignments: WireAssignment[];
  summary: {
    total_patients: number;
    my_patients_count: number;
    unassigned_count: number;
  };
}

const DOC_A: WireAssignedStaff = { staff_id: 'doc-001', display_name: '김내과', role: 'physician' };
const DOC_B: WireAssignedStaff = { staff_id: 'doc-002', display_name: '박응급', role: 'physician' };
const DOC_C: WireAssignedStaff = { staff_id: 'doc-003', display_name: '이중환', role: 'physician' };

const NURSE_A: WireAssignedStaff = { staff_id: 'nurse-001', display_name: '이간호', role: 'nurse' };
const NURSE_B: WireAssignedStaff = { staff_id: 'nurse-002', display_name: '최간호', role: 'nurse' };
const NURSE_C: WireAssignedStaff = { staff_id: 'nurse-003', display_name: '한간호', role: 'nurse' };
const NURSE_D: WireAssignedStaff = { staff_id: 'nurse-004', display_name: '윤간호', role: 'nurse' };

const ASSIGNMENTS: WireAssignment[] = [
  {
    stay_token: 'ST-19482', patient_token: 'PT-19482', current_bed_label: 'A-01',
    assigned_staff: [DOC_A, NURSE_A],
  },
  {
    stay_token: 'ST-20314', patient_token: 'PT-20314', current_bed_label: 'A-02',
    assigned_staff: [DOC_A, NURSE_A],
  },
  {
    stay_token: 'ST-20781', patient_token: 'PT-20781', current_bed_label: 'A-03',
    assigned_staff: [DOC_B, NURSE_B],
  },
  {
    stay_token: 'ST-21005', patient_token: 'PT-21005', current_bed_label: 'A-04',
    assigned_staff: [DOC_B, NURSE_B],
  },
  {
    stay_token: 'ST-21219', patient_token: 'PT-21219', current_bed_label: 'A-05',
    assigned_staff: [DOC_C, NURSE_C],
  },
  {
    stay_token: 'ST-21442', patient_token: 'PT-21442', current_bed_label: 'A-06',
    assigned_staff: [DOC_C, NURSE_C],
  },
  {
    stay_token: 'ST-21508', patient_token: 'PT-21508', current_bed_label: 'A-07',
    assigned_staff: [DOC_C, NURSE_D],
  },
  {
    stay_token: 'ST-21603', patient_token: 'PT-21603', current_bed_label: 'A-08',
    assigned_staff: [DOC_C, NURSE_D],
  },
];

export const mockDashboardStaffing: WireDashboardStaffing = {
  icu_unit_code: 'ICU_A',
  assignments: ASSIGNMENTS,
  summary: {
    total_patients: ASSIGNMENTS.length,
    // DOC_A 담당 (ST-19482, ST-20314) — 현재 사용자(staff-010)가 DOC_A에 매핑된다고 가정
    my_patients_count: 2,
    unassigned_count: 0,
  },
};
