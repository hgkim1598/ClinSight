/**
 * 환자 token → 표시명 매핑.
 *
 * V4 API는 PHI 정책상 응답에 환자 실명을 포함하지 않는다 (§0.8).
 * 화면 표시용 실명은 token을 키로 별도 매핑한다.
 *
 * 현재: 프론트 mock 파일.
 * Phase 2: Hospital-Sim VPC 내부의 매칭 서비스(또는 EMR 조회 endpoint)로 대체.
 *
 * 매칭 실패 시 호출자가 token을 그대로 표시한다 (formatPatientName 참조).
 */
export const PATIENT_NAMES: Record<string, string> = {
  'PT-19482': '김영호',
  'PT-20314': '박선미',
  'PT-20781': '이재훈',
  'PT-21005': '최민정',
  'PT-21219': '정태식',
  'PT-21442': '한수경',
  'PT-21508': '오상혁',
  'PT-21603': '윤지원',
};

/**
 * staff_id → 표시명 매핑.
 * /staff 응답이 활성화되면 그쪽으로 옮긴다. 그 전까지 협진/알림 표시용으로 사용.
 */
export const STAFF_NAMES: Record<string, string> = {
  'staff-001': '박지훈',
  'staff-002': '이수진',
  'staff-003': '김태영',
  'staff-004': '정하늘',
  'staff-005': '오세준',
  'staff-006': '최민서',
  'staff-007': '한도윤',
  'staff-008': '윤서연',
  'staff-009': '장민혁',
  'staff-010': '김영준',
  'staff-011': '이하은',
  'staff-012': '박소영',
  'staff-013': '강동훈',
  'staff-014': '배은지',
};
