/**
 * GET /consultations 응답을 모사한 mock.
 *
 * V4 명세 §8-3 + §8-5.
 *  - id: consultation_id (UUID)
 *  - 환자 식별: stay_token (실명/베드 별도 매칭)
 *  - status: 'requested' | 'in_progress' | 'completed'
 *  - subject 필수, attached_report_id?, recipients[].role: 'to' | 'cc'
 */

export interface WireRecipient {
  department_code: string;
  staff_id: string | null;
  role: 'to' | 'cc';
}

export interface WireConsultation {
  consultation_id: string;
  subject: string;
  // 실제 API는 priority 를 'normal' 등 enum 밖 값으로도 보냄 → 매퍼에서 정규화.
  priority: string;
  status: 'requested' | 'in_progress' | 'completed';
  created_at: string;
  // 실제 API 응답에서 누락 가능 — 매퍼에서 폴백. stay_token 대신 stay_id 로 옴.
  // TODO: 백엔드 필드 통일 후 폴백 제거.
  stay_token?: string;
  stay_id?: string;
  message?: string;
  requester_staff_id?: string;
  requester_department_code?: string;
  recipients_jsonb?: WireRecipient[];
  attached_report_id?: string | null;
  updated_at?: string;
}

export const mockConsultations: WireConsultation[] = [
  {
    consultation_id: 'consult-001',
    stay_token: 'ST-19482',
    subject: 'AKI Stage 2 신대체요법 자문',
    message: 'AKI Stage 2 진행, Cr 2.1 (baseline 0.9). 신대체요법 필요성 평가 요청.',
    priority: 'urgent',
    status: 'requested',
    requester_staff_id: 'staff-010',
    requester_department_code: 'icu',
    recipients_jsonb: [
      { department_code: 'nephrology', staff_id: 'staff-001', role: 'to' },
      { department_code: 'infectious', staff_id: 'staff-006', role: 'cc' },
    ],
    attached_report_id: null,
    created_at: '2025-04-29T13:50:00+09:00',
    updated_at: '2025-04-29T13:50:00+09:00',
  },
  {
    consultation_id: 'consult-002',
    stay_token: 'ST-19482',
    subject: '중등도 ARDS 환기 전략 자문',
    message: 'P/F ratio 152, 중등도 ARDS. Prone positioning 및 환기 전략 자문 요청.',
    priority: 'urgent',
    status: 'in_progress',
    requester_staff_id: 'staff-010',
    requester_department_code: 'icu',
    recipients_jsonb: [
      { department_code: 'pulmonology', staff_id: 'staff-004', role: 'to' },
    ],
    attached_report_id: null,
    created_at: '2025-04-29T08:30:00+09:00',
    updated_at: '2025-04-29T09:00:00+09:00',
  },
  {
    consultation_id: 'consult-003',
    stay_token: 'ST-19482',
    subject: '항생제 선택 자문',
    message: '항생제 선택 자문 — 의심 균주 및 내성 패턴 평가 요청. 혈액배양 결과 회신 후 종결.',
    priority: 'routine',
    status: 'completed',
    requester_staff_id: 'staff-010',
    requester_department_code: 'icu',
    recipients_jsonb: [
      { department_code: 'infectious', staff_id: 'staff-006', role: 'to' },
    ],
    attached_report_id: null,
    created_at: '2025-04-28T22:15:00+09:00',
    updated_at: '2025-04-29T07:00:00+09:00',
  },
  {
    consultation_id: 'consult-004',
    stay_token: 'ST-20314',
    subject: '복강 내 출혈 응급 수술 평가',
    message: '다발성 외상 후 복강 내 출혈 의심. 응급 수술 가능성 평가 요청.',
    priority: 'urgent',
    status: 'requested',
    requester_staff_id: 'staff-010',
    requester_department_code: 'icu',
    recipients_jsonb: [
      { department_code: 'surgery', staff_id: 'staff-013', role: 'to' },
    ],
    attached_report_id: null,
    created_at: '2025-04-29T11:20:00+09:00',
    updated_at: '2025-04-29T11:20:00+09:00',
  },
  {
    consultation_id: 'consult-005',
    stay_token: 'ST-20781',
    subject: '췌장염 외과 개입 시점 자문',
    message: '급성 췌장염 — 괴사성 변화 가능성. 외과적 개입 시점 자문.',
    priority: 'routine',
    status: 'in_progress',
    requester_staff_id: 'staff-010',
    requester_department_code: 'icu',
    recipients_jsonb: [
      { department_code: 'surgery', staff_id: 'staff-013', role: 'to' },
    ],
    attached_report_id: null,
    created_at: '2025-04-29T09:40:00+09:00',
    updated_at: '2025-04-29T10:30:00+09:00',
  },
  {
    consultation_id: 'consult-006',
    stay_token: 'ST-19482',
    subject: '폐렴 초기 평가',
    message: '폐렴 초기 평가 — 항생제 반응 및 흉부 영상 추적 자문. 종결.',
    priority: 'routine',
    status: 'completed',
    requester_staff_id: 'staff-010',
    requester_department_code: 'icu',
    recipients_jsonb: [
      { department_code: 'pulmonology', staff_id: 'staff-004', role: 'to' },
    ],
    attached_report_id: null,
    created_at: '2025-04-27T14:50:00+09:00',
    updated_at: '2025-04-28T10:00:00+09:00',
  },
  {
    consultation_id: 'consult-007',
    stay_token: 'ST-21005',
    subject: '심부전 이뇨제 용량 조정',
    message: '울혈성 심부전 악화 — 이뇨제 용량 조정 및 BNP 추적 자문.',
    priority: 'routine',
    status: 'requested',
    requester_staff_id: 'staff-010',
    requester_department_code: 'icu',
    recipients_jsonb: [
      { department_code: 'cardiology', staff_id: 'staff-008', role: 'to' },
    ],
    attached_report_id: null,
    created_at: '2025-04-29T07:10:00+09:00',
    updated_at: '2025-04-29T07:10:00+09:00',
  },
];
