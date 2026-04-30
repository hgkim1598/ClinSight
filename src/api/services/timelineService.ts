/**
 * Clinical Timeline Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/timeline.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /patients/{id}/timeline (24시간 이벤트, 최신순)
 *
 * 참고: docs/DYNAMO_SCHEMA.md §12 ClinicalTimeline
 */
import type { ScheduledEvent, TimelineEvent } from '../../types';
import { mockSchedule, mockTimeline } from '../mock/timeline';

export async function getTimeline(patientId: string): Promise<TimelineEvent[]> {
  return mockTimeline[patientId] ?? [];
}

/**
 * 환자의 예정된 임상 이벤트(투약 다음 시점·정기 검사 등)를 반환한다.
 * 백엔드 연결 시 GET /patients/{id}/schedule 또는 처방/오더 테이블에서 도출.
 */
export async function getSchedule(patientId: string): Promise<ScheduledEvent[]> {
  return mockSchedule[patientId] ?? [];
}
