/**
 * 부서 코드 → 표시명 매핑 + 의료진 부서별 그루핑.
 *
 * /staff 응답에는 부서 코드(primary_department_code)만 있고 한글명이 없어,
 * 표시명은 프론트 정적 맵으로 보강한다 (/staff/departments 의존 제거).
 * 매핑에 없는 코드는 코드 그대로 표시(폴백).
 *
 * TODO: /staff 응답에 부서 표시명 필드가 추가되면 그 값을 우선 사용.
 */
import type { StaffMember } from '../types';

export const DEPARTMENT_LABELS: Record<string, string> = {
  icu: '중환자의학과',
  cardiology: '심장내과',
  infectious: '감염내과',
  pulmonology: '호흡기내과',
  nephrology: '신장내과',
  surgery: '외과',
};

export function departmentLabel(code: string): string {
  return DEPARTMENT_LABELS[code] ?? code;
}

/** 부서별 의료진 그룹 (DepartmentTree 렌더 단위). */
export interface DeptGroup {
  code: string;
  displayName: string;
  staff: StaffMember[];
}

/** 전체 의료진을 primary_department_code 기준으로 그루핑. 표시명 가나다순 정렬. */
export function groupStaffByDepartment(staff: StaffMember[]): DeptGroup[] {
  const byCode = new Map<string, StaffMember[]>();
  for (const s of staff) {
    const code = s.primaryDepartmentCode || '';
    const list = byCode.get(code);
    if (list) list.push(s);
    else byCode.set(code, [s]);
  }
  return Array.from(byCode.entries())
    .map(([code, members]) => ({
      code,
      displayName: departmentLabel(code),
      staff: members,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
}
