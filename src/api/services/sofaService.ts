/**
 * SOFA Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/sofaScores.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /patients/{id}/sofa
 *      → 백엔드에서 row 시계열을 SofaTrend(times[] + scores by organ)로 pivot
 *
 * 참고: docs/DYNAMO_SCHEMA.md §8 SofaScores
 */
import type { SofaTrend } from '../../types';
import { emptySofaTrend, sofaTrendByPatient } from '../mock/sofaScores';

export async function getSofaTrend(patientId: string): Promise<SofaTrend> {
  return sofaTrendByPatient[patientId] ?? emptySofaTrend();
}
