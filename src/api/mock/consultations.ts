import type { ConsultationRequest } from '../../types';

/**
 * 협진 요청 mock — 누적 내역.
 * 백엔드 연결 시 GET /consultations + POST /consultations 로 교체.
 */
export const mockConsultations: ConsultationRequest[] = [
  {
    id: 'consult-001',
    patientId: 'PT-19482',
    patientName: '김영호',
    patientBed: 'A-01',
    requestedBy: '담당 의료진',
    requestedAt: '2025-04-29 13:50',
    priority: 'urgent',
    status: 'pending',
    recipients: [
      { staffId: 'staff-001', name: '박지훈', department: '신장내과', role: 'to' },
      { staffId: 'staff-006', name: '최민서', department: '감염내과', role: 'cc' },
    ],
    reason:
      'AKI Stage 2 진행, Cr 2.1 (baseline 0.9). 신대체요법 필요성 평가 요청.',
  },
  {
    id: 'consult-002',
    patientId: 'PT-19482',
    patientName: '김영호',
    patientBed: 'A-01',
    requestedBy: '담당 의료진',
    requestedAt: '2025-04-29 08:30',
    priority: 'urgent',
    status: 'accepted',
    recipients: [
      { staffId: 'staff-004', name: '정하늘', department: '호흡기내과', role: 'to' },
    ],
    reason:
      'P/F ratio 152, 중등도 ARDS. Prone positioning 및 환기 전략 자문 요청.',
  },
  {
    id: 'consult-003',
    patientId: 'PT-19482',
    patientName: '김영호',
    patientBed: 'A-01',
    requestedBy: '담당 의료진',
    requestedAt: '2025-04-28 22:15',
    priority: 'routine',
    status: 'completed',
    recipients: [
      { staffId: 'staff-006', name: '최민서', department: '감염내과', role: 'to' },
    ],
    reason:
      '항생제 선택 자문 — 의심 균주 및 내성 패턴 평가 요청. 혈액배양 결과 회신 후 종결.',
  },
  {
    id: 'consult-004',
    patientId: 'PT-20314',
    patientName: '박선미',
    patientBed: 'A-02',
    requestedBy: '담당 의료진',
    requestedAt: '2025-04-29 11:20',
    priority: 'urgent',
    status: 'pending',
    recipients: [
      { staffId: 'staff-013', name: '강동훈', department: '외과', role: 'to' },
    ],
    reason:
      '다발성 외상 후 복강 내 출혈 의심. 응급 수술 가능성 평가 요청.',
  },
  {
    id: 'consult-005',
    patientId: 'PT-20781',
    patientName: '이재훈',
    patientBed: 'A-03',
    requestedBy: '담당 의료진',
    requestedAt: '2025-04-29 09:40',
    priority: 'routine',
    status: 'accepted',
    recipients: [
      { staffId: 'staff-013', name: '강동훈', department: '외과', role: 'to' },
    ],
    reason:
      '급성 췌장염 — 괴사성 변화 가능성. 외과적 개입 시점 자문.',
  },
  {
    id: 'consult-006',
    patientId: 'PT-19482',
    patientName: '김영호',
    patientBed: 'A-01',
    requestedBy: '담당 의료진',
    requestedAt: '2025-04-27 14:50',
    priority: 'routine',
    status: 'completed',
    recipients: [
      { staffId: 'staff-004', name: '정하늘', department: '호흡기내과', role: 'to' },
    ],
    reason:
      '폐렴 초기 평가 — 항생제 반응 및 흉부 영상 추적 자문. 종결.',
  },
  {
    id: 'consult-007',
    patientId: 'PT-21005',
    patientName: '최민정',
    patientBed: 'A-04',
    requestedBy: '담당 의료진',
    requestedAt: '2025-04-29 07:10',
    priority: 'routine',
    status: 'pending',
    recipients: [
      { staffId: 'staff-008', name: '윤서연', department: '심장내과', role: 'to' },
    ],
    reason:
      '울혈성 심부전 악화 — 이뇨제 용량 조정 및 BNP 추적 자문.',
  },
];
