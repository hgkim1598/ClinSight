import { emptySofaTrend, sofaTrendByPatient } from '../mock/sofaScores';
import type { SofaTrend } from '../../types';

/**
 * 환자의 SOFA 6개 장기 점수 추이를 반환한다.
 * 추후 백엔드 연결 시 GET /patients/{id}/sofa 같은 엔드포인트 fetch로 교체될 자리.
 */
export function getSofaTrend(patientId: string): SofaTrend {
  return sofaTrendByPatient[patientId] ?? emptySofaTrend();
}
