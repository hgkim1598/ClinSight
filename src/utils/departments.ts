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

/** 근무 상태 표시 등급. available(응답 가능) → delayed(지연 가능) → unavailable(응답 불가). */
export type DutyLevel = 'available' | 'delayed' | 'unavailable';

const DUTY_STATUS: Record<string, { label: string; level: DutyLevel }> = {
  on_duty: { label: '재실', level: 'available' },
  on_call: { label: '당직', level: 'available' },
  out: { label: '외출', level: 'delayed' },
  away: { label: '교육·학회', level: 'delayed' },
  off: { label: '휴진', level: 'unavailable' },
  leave: { label: '휴가', level: 'unavailable' },
};

/** duty_status → 표시 라벨 + 등급. 미지값은 원문 + 응답 불가(안전측)로 처리. */
export function dutyStatusInfo(dutyStatus: string): { label: string; level: DutyLevel } {
  return DUTY_STATUS[dutyStatus] ?? { label: dutyStatus || '미상', level: 'unavailable' };
}

const DUTY_LEVEL_ORDER: Record<DutyLevel, number> = {
  available: 0,
  delayed: 1,
  unavailable: 2,
};

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
      // 같은 부서 내: 응답 가능 → 지연 가능 → 응답 불가 순.
      staff: [...members].sort(
        (a, b) =>
          DUTY_LEVEL_ORDER[dutyStatusInfo(a.dutyStatus).level] -
          DUTY_LEVEL_ORDER[dutyStatusInfo(b.dutyStatus).level],
      ),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
}
