/**
 * Vital Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/vitals.ts — series + labs 묶음)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /patients/{id}/vitals
 *      → 백엔드에서 Vitals + Labs 두 테이블을 join해 VitalData 형태로 반환
 *
 * 참고: docs/DYNAMO_SCHEMA.md §5 Vitals + §6 Labs
 */
import type { VitalData } from '../../types';
import { emptyVitals, vitalsByPatient } from '../mock/vitals';

export async function getVitals(patientId: string): Promise<VitalData> {
  return vitalsByPatient[patientId] ?? emptyVitals;
}
