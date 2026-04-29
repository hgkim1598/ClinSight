/**
 * ICU Staffing Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/staffing.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /icus/{icuId}/staffing
 *
 * 참고: docs/DYNAMO_SCHEMA.md §9 IcuStaffing
 */
import type { StaffingSnapshot } from '../../types';
import { staffing } from '../mock/staffing';

export async function getStaffing(): Promise<StaffingSnapshot> {
  return staffing;
}
