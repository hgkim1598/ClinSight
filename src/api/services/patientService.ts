import type { Patient } from '../../types';
import { patients } from '../mock/patients';

export function getPatients(): Patient[] {
  return patients;
}

export function getPatientById(id: string): Patient | undefined {
  return patients.find((p) => p.id === id);
}
