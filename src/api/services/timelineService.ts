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
  // 실제 API가 식별자 필드를 다르게 보낼 수 있어 폴백 체인 구성.
  const fallbackKey = `tl-${index}-${
    w.timeline_time ?? (w as { observed_at?: string; timestamp?: string }).observed_at ?? (w as { timestamp?: string }).timestamp ?? ''
  }`;
  const id =
    w.item_id ?? (w as { id?: string }).id ?? fallbackKey;
  return {
    id,
    time: formatTime(w.timeline_time),
    title: w.title,
    description: w.summary,
    category: mapCategory(w.detail_category),
    severity: mapSeverity(w.severity),
    itemType: w.item_type as TimelineItemType,
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
