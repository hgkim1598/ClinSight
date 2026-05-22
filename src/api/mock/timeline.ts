/**
 * GET /icu-stays/{stayId}/timeline + /schedule 응답을 모사한 mock.
 *
 * V4 명세 §6-1, §6-2.
 * - timeline.item_type: 'prediction' | 'alert' | 'event'
 * - timeline.detail_category: UI 아이콘 분기용 (vitals/lab/medication/...)
 * - schedule.derivation_basis: 처방 근거 표시용
 */

export interface WireTimelineItem {
  // 뷰(v_clinical_timeline) 기준 — 설계 정본. 백엔드 뷰 전환 후 이 필드들로 들어온다.
  item_type?: 'prediction' | 'alert' | 'event';
  item_id?: string;
  timeline_time?: string;
  title?: string;
  summary?: string;
  severity?: 'critical' | 'warning' | 'info' | 'high';
  detail_category?: string;
  payload_jsonb?: Record<string, unknown>;
  // 폴백용 — 현재 백엔드가 내려주는 원본 clinical_events(event_*) 필드.
  // TODO: 백엔드 뷰 전환 완료 후 폴백 필드 제거
  event_time?: string;
  event_type?: string;
  body?: string;
  source?: string;
}

export interface WireTimelineResponse {
  stay_token: string;
  timeline: WireTimelineItem[];
}

export interface WireScheduledEvent {
  event_id: string;
  event_type: string;
  event_category: string;
  event_title: string;
  event_description: string;
  event_status: string;
  event_time: string;
  end_time: string | null;
  derivation_basis: string;
}

export interface WireScheduleResponse {
  stay_token: string;
  scheduled_events: WireScheduledEvent[];
}

const ISO = (h: number, m: number) =>
  `2026-05-11T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`;

const PT19482_TIMELINE: WireTimelineItem[] = [
  {
    item_type: 'event',
    item_id: 'tl-001',
    timeline_time: ISO(14, 20),
    title: 'MAP 58 mmHg로 하락',
    summary: 'NE 용량 증량: 0.12 → 0.18 mcg/kg/min',
    severity: 'critical',
    detail_category: 'vitals',
  },
  {
    item_type: 'event',
    item_id: 'tl-002',
    timeline_time: ISO(13, 45),
    title: 'Lactate 재검: 3.8 mmol/L',
    summary: '수액 30 mL/kg 투여에도 clearance 없음',
    severity: 'warning',
    detail_category: 'lab',
  },
  {
    item_type: 'event',
    item_id: 'tl-003',
    timeline_time: ISO(12, 30),
    title: '혈액배양 × 2세트 채취',
    summary: '항생제 투여 전 시행',
    severity: 'info',
    detail_category: 'procedure',
  },
  {
    item_type: 'event',
    item_id: 'tl-004',
    timeline_time: ISO(11, 50),
    title: 'Piperacillin/Tazobactam 개시',
    summary: '4.5g IV q8h — 1시간 번들 완료',
    severity: 'info',
    detail_category: 'medication',
  },
  {
    item_type: 'prediction',
    item_id: 'tl-005',
    timeline_time: ISO(10, 20),
    title: 'SOFA 점수 상승: 7 → 11',
    summary: '신기능 악화: Cr 1.4 → 2.1',
    severity: 'warning',
    detail_category: 'assessment',
  },
  {
    item_type: 'alert',
    item_id: 'tl-006',
    timeline_time: ISO(8, 15),
    title: 'AI 패혈증 경보 — 고위험',
    summary: '모델 Risk 87% → 94% (2시간 내 +7%p)',
    severity: 'critical',
    detail_category: 'alert',
  },
  {
    item_type: 'event',
    item_id: 'tl-007',
    timeline_time: ISO(6, 0),
    title: '기계환기 시작',
    summary: 'FiO2 0.6, PEEP 8, P/F ratio: 152',
    severity: 'warning',
    detail_category: 'procedure',
  },
  {
    item_type: 'event',
    item_id: 'tl-008',
    timeline_time: ISO(4, 30),
    title: 'Norepinephrine 개시',
    summary: '초기 용량 0.05 mcg/kg/min, MAP 목표 ≥65',
    severity: 'info',
    detail_category: 'medication',
  },
];

export const mockTimelineByStay: Record<string, WireTimelineResponse> = {
  'ST-19482': { stay_token: 'ST-19482', timeline: PT19482_TIMELINE },
  'ST-20314': { stay_token: 'ST-20314', timeline: [] },
  'ST-20781': { stay_token: 'ST-20781', timeline: [] },
};

const PT19482_SCHEDULE: WireScheduledEvent[] = [
  {
    event_id: 'sch-001',
    event_type: 'order',
    event_category: 'medication',
    event_title: 'Piperacillin/Tazobactam 투여',
    event_description: '4.5g IV — 3회차',
    event_status: 'scheduled',
    event_time: ISO(15, 50),
    end_time: null,
    derivation_basis: '처방: q8h (직전 투여 11:50)',
  },
  {
    event_id: 'sch-002',
    event_type: 'protocol',
    event_category: 'vitals',
    event_title: '정기 바이탈 측정',
    event_description: 'HR, MAP, SpO2, RR, Temp',
    event_status: 'scheduled',
    event_time: ISO(16, 0),
    end_time: null,
    derivation_basis: 'ICU 프로토콜: 2시간 간격',
  },
  {
    event_id: 'sch-003',
    event_type: 'order',
    event_category: 'lab',
    event_title: 'Lactate 재검',
    event_description: '이전 결과 3.8 mmol/L — clearance 확인',
    event_status: 'scheduled',
    event_time: ISO(17, 0),
    end_time: null,
    derivation_basis: '처방: q4h (직전 채혈 13:45)',
  },
  {
    event_id: 'sch-004',
    event_type: 'order',
    event_category: 'lab',
    event_title: 'ABG 검사',
    event_description: 'P/F ratio 추적, 환기 설정 평가',
    event_status: 'scheduled',
    event_time: ISO(18, 0),
    end_time: null,
    derivation_basis: '기계환기 중 프로토콜: q6h',
  },
  {
    event_id: 'sch-005',
    event_type: 'order',
    event_category: 'medication',
    event_title: 'Piperacillin/Tazobactam 투여',
    event_description: '4.5g IV — 4회차',
    event_status: 'scheduled',
    event_time: ISO(19, 50),
    end_time: null,
    derivation_basis: '처방: q8h (직전 투여 15:50 예정 기준)',
  },
];

export const mockScheduleByStay: Record<string, WireScheduleResponse> = {
  'ST-19482': { stay_token: 'ST-19482', scheduled_events: PT19482_SCHEDULE },
};
