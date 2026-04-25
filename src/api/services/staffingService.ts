import type { StaffingSnapshot } from '../../types';
import { staffing } from '../mock/staffing';

export function getStaffing(): StaffingSnapshot {
  return staffing;
}
