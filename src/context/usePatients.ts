import { useContext } from 'react';
import { PatientsCtx, type PatientsContextValue } from './patientsContextObj';

export function usePatients(): PatientsContextValue {
  const v = useContext(PatientsCtx);
  if (!v) throw new Error('usePatients must be used within PatientsProvider');
  return v;
}
