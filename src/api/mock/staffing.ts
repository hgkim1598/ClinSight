import type { StaffingSnapshot } from '../../types';

export const staffing: StaffingSnapshot = {
  icuId: 'ICU-01',
  updatedAt: '2026-04-25T08:00:00+09:00',
  totalBeds: 20,
  doctors: {
    onDuty: 3,
    total: 4,
    activities: [
      { label: '회진', count: 2 },
      { label: '수술', count: 1 },
    ],
  },
  nurses: {
    onDuty: 4,
  },
  thresholds: {
    maxPatientsPerNurse: 2,
  },
};
