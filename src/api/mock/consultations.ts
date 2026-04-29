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
];
