import type { VitalData } from '../../types';
import { emptyVitals, vitalsByPatient } from '../mock/vitals';

export function getVitals(patientId: string): VitalData {
  return vitalsByPatient[patientId] ?? emptyVitals;
}
