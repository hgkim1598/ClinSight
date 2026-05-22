/**
 * GET /staff/departments — 부서 메타만.
 * 의료진은 /staff에서 별도 조회.
 */

export interface WireDepartment {
  config_key: string;
  display_name: string;
  sort_order: number;
  // 실제 API는 config_key 대신 department_code 로 내려줌 — 폴백용.
  // TODO: 백엔드 필드 통일 후 폴백 제거.
  department_code?: string;
}

export const mockDepartments: WireDepartment[] = [
  { config_key: 'icu',         display_name: '중환자의학과', sort_order: 1 },
  { config_key: 'cardiology',  display_name: '심장내과',     sort_order: 2 },
  { config_key: 'infectious',  display_name: '감염내과',     sort_order: 3 },
  { config_key: 'pulmonology', display_name: '호흡기내과',   sort_order: 4 },
  { config_key: 'nephrology',  display_name: '신장내과',     sort_order: 5 },
  { config_key: 'surgery',     display_name: '외과',         sort_order: 6 },
];
