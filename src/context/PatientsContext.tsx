/**
 * PatientsProvider — 대시보드 환자 목록의 메모리 캐시.
 *
 * fetch 소유권 없음. OverviewPage 가 `getDashboardPatients` 로 이미 받아온 목록을
 * `setPatients` 로 저장하면, AlertsPage 등이 `usePatients()` 로 추가 호출 없이 재사용한다.
 * stayId(UUID) → 환자 매칭용 Map 을 파생해 제공한다.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { DashboardPatient } from '../types';
import { PatientsCtx, type PatientsContextValue } from './patientsContextObj';

export function PatientsProvider({ children }: { children: ReactNode }) {
  const [patients, setPatientsState] = useState<DashboardPatient[]>([]);

  const setPatients = useCallback((list: DashboardPatient[]) => {
    setPatientsState(list);
  }, []);

  const value = useMemo<PatientsContextValue>(() => {
    const patientByStayId = new Map<string, DashboardPatient>();
    for (const p of patients) {
      if (p.stayId) patientByStayId.set(p.stayId, p);
    }
    return { patients, patientByStayId, setPatients };
  }, [patients, setPatients]);

  return <PatientsCtx.Provider value={value}>{children}</PatientsCtx.Provider>;
}
