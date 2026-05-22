/**
 * Clinical Timeline Service
 *
 *  - GET /icu-stays/{stayId}/timeline → getTimeline()
 *  - GET /icu-stays/{stayId}/schedule → getSchedule()
 *
 * API의 ISO 시각/필드명을 컴포넌트 view-model로 변환한다.
 */
import type {
  ScheduledEvent,
  TimelineEvent,
  TimelineEventCategory,
  TimelineEventSeverity,
  TimelineItemType,
} from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  mockScheduleByStay,
  mockTimelineByStay,
  type WireScheduleResponse,
  type WireScheduledEvent,
  type WireTimelineItem,
  type WireTimelineResponse,
} from '../mock/timeline';
import { formatTime } from '../../utils/time';

function mapCategory(detailCategory: string): TimelineEventCategory {
  const allowed: TimelineEventCategory[] = [
    'vitals', 'lab', 'medication', 'procedure', 'assessment',
    'alert', 'mortality', 'aki', 'ards', 'sic', 'shock',
  ];
  return (allowed.includes(detailCategory as TimelineEventCategory)
    ? (detailCategory as TimelineEventCategory)
    : 'assessment');
}

function mapSeverity(s: string): TimelineEventSeverity {
  if (s === 'critical' || s === 'high') return 'critical';
  if (s === 'warning') return 'warning';
  return 'info';
}

function mapTimelineItem(w: WireTimelineItem, index: number): TimelineEvent {
  // 백엔드가 아직 v_clinical_timeline 뷰가 아닌 원본 clinical_events(event_*)를 내려준다.
  // 뷰 기준 필드가 오면 그걸 쓰고, 없으면 원본 필드로 폴백 → 뷰 전환 후에도 안 깨짐.
  // TODO: 백엔드 뷰 전환 완료 후 폴백 필드(event_time/event_type/body/source) 제거
  const timelineTime = w.timeline_time ?? w.event_time;
  const itemType = w.item_type ?? w.event_type;
  const summary = w.summary ?? w.body;
  const detailCategory = w.detail_category ?? w.source;

  // 실제 API가 식별자 필드를 다르게 보낼 수 있어 폴백 체인 구성.
  const fallbackKey = `tl-${index}-${
    timelineTime ?? (w as { observed_at?: string; timestamp?: string }).observed_at ?? (w as { timestamp?: string }).timestamp ?? ''
  }`;
  const id =
    w.item_id ?? (w as { id?: string }).id ?? fallbackKey;
  return {
    id,
    time: formatTime(timelineTime ?? ''),
    title: w.title ?? '',
    description: summary ?? '',
    category: mapCategory(detailCategory ?? ''),
    severity: mapSeverity(w.severity ?? ''),
    itemType: itemType as TimelineItemType,
  };
}

function mapScheduledEvent(w: WireScheduledEvent, index: number): ScheduledEvent {
  const fallbackKey = `sch-${index}-${w.event_time ?? ''}`;
  const id =
    w.event_id ?? (w as { id?: string }).id ?? fallbackKey;
  return {
    id,
    time: formatTime(w.event_time),
    title: w.event_title,
    description: w.event_description,
    category: mapCategory(w.event_category),
    basis: w.derivation_basis,
  };
}

export async function getTimeline(stayId: string): Promise<TimelineEvent[]> {
  if (MOCK_MODE) {
    const w = mockTimelineByStay[stayId];
    return (w?.timeline ?? []).map(mapTimelineItem);
  }
  const w = await request<WireTimelineResponse>(
    `/icu-stays/${encodeURIComponent(stayId)}/timeline`,
  );
  return w.timeline.map(mapTimelineItem);
}

export async function getSchedule(stayId: string): Promise<ScheduledEvent[]> {
  if (MOCK_MODE) {
    const w = mockScheduleByStay[stayId];
    return (w?.scheduled_events ?? []).map(mapScheduledEvent);
  }
  const w = await request<WireScheduleResponse>(
    `/icu-stays/${encodeURIComponent(stayId)}/schedule`,
  );
  return w.scheduled_events.map(mapScheduledEvent);
}
