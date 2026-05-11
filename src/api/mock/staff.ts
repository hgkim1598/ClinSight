/**
 * GET /staff — 의료진 목록.
 * 부서 코드/역할 필터링은 service에서 처리.
 */

export interface WireStaff {
  staff_id: string;
  display_name: string;
  role: string;
  primary_department_code: string;
  status: string;
}

export const mockStaff: WireStaff[] = [
  // 신장내과
  { staff_id: 'staff-001', display_name: '박지훈', role: 'physician', primary_department_code: 'nephrology', status: 'active' },
  { staff_id: 'staff-002', display_name: '이수진', role: 'resident', primary_department_code: 'nephrology', status: 'active' },
  { staff_id: 'staff-003', display_name: '김태영', role: 'physician', primary_department_code: 'nephrology', status: 'off_duty' },
  // 호흡기내과
  { staff_id: 'staff-004', display_name: '정하늘', role: 'physician', primary_department_code: 'pulmonology', status: 'active' },
  { staff_id: 'staff-005', display_name: '오세준', role: 'resident', primary_department_code: 'pulmonology', status: 'active' },
  // 감염내과
  { staff_id: 'staff-006', display_name: '최민서', role: 'physician', primary_department_code: 'infectious', status: 'active' },
  { staff_id: 'staff-007', display_name: '한도윤', role: 'resident', primary_department_code: 'infectious', status: 'off_duty' },
  // 심장내과
  { staff_id: 'staff-008', display_name: '윤서연', role: 'physician', primary_department_code: 'cardiology', status: 'active' },
  { staff_id: 'staff-009', display_name: '장민혁', role: 'resident', primary_department_code: 'cardiology', status: 'active' },
  // 중환자의학과
  { staff_id: 'staff-010', display_name: '김영준', role: 'physician', primary_department_code: 'icu', status: 'active' },
  { staff_id: 'staff-011', display_name: '이하은', role: 'resident', primary_department_code: 'icu', status: 'active' },
  { staff_id: 'staff-012', display_name: '박소영', role: 'head_nurse', primary_department_code: 'icu', status: 'active' },
  // 외과
  { staff_id: 'staff-013', display_name: '강동훈', role: 'physician', primary_department_code: 'surgery', status: 'active' },
  { staff_id: 'staff-014', display_name: '배은지', role: 'resident', primary_department_code: 'surgery', status: 'off_duty' },
];
