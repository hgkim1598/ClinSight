import type { Department } from '../../types';

/**
 * 협진 요청 시 선택할 수 있는 부서/의료진 트리.
 * 백엔드 연결 시 GET /staff/departments 으로 교체.
 */
export const mockDepartments: Department[] = [
  {
    id: 'dept-nephro',
    name: '신장내과',
    members: [
      { id: 'staff-001', name: '박지훈', role: '전문의', available: true },
      { id: 'staff-002', name: '이수진', role: '전공의', available: true },
      { id: 'staff-003', name: '김태영', role: '전문의', available: false },
    ],
  },
  {
    id: 'dept-pulmo',
    name: '호흡기내과',
    members: [
      { id: 'staff-004', name: '정하늘', role: '전문의', available: true },
      { id: 'staff-005', name: '오세준', role: '전공의', available: true },
    ],
  },
  {
    id: 'dept-infect',
    name: '감염내과',
    members: [
      { id: 'staff-006', name: '최민서', role: '전문의', available: true },
      { id: 'staff-007', name: '한도윤', role: '전공의', available: false },
    ],
  },
  {
    id: 'dept-cardio',
    name: '심장내과',
    members: [
      { id: 'staff-008', name: '윤서연', role: '전문의', available: true },
      { id: 'staff-009', name: '장민혁', role: '전공의', available: true },
    ],
  },
  {
    id: 'dept-icu',
    name: '중환자의학과',
    members: [
      { id: 'staff-010', name: '김영준', role: '전문의', available: true },
      { id: 'staff-011', name: '이하은', role: '전공의', available: true },
      { id: 'staff-012', name: '박소영', role: '수간호사', available: true },
    ],
  },
  {
    id: 'dept-surgery',
    name: '외과',
    members: [
      { id: 'staff-013', name: '강동훈', role: '전문의', available: true },
      { id: 'staff-014', name: '배은지', role: '전공의', available: false },
    ],
  },
];
