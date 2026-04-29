import type { TimelineEvent } from '../../types';
import { mockTimeline } from '../mock/timeline';

/**
 * 환자의 임상 타임라인 이벤트를 반환한다.
 * 백엔드 연결 시 GET /patients/{id}/timeline 호출로 교체.
 */
export function getTimeline(patientId: string): TimelineEvent[] {
  return mockTimeline[patientId] ?? [];
}
