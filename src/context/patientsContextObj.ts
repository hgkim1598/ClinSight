import { createContext } from 'react';
import type { DashboardPatient } from '../types';

/**
 * 환자 목록 메모리 캐시.
 *
 * OverviewPage 가 이미 받아온 대시보드 환자 목록을 write-through 로 저장해 두고,
 * AlertsPage 등 다른 화면이 추가 API 호출 없이 stayId 로 환자(이름/병실)를 매칭한다.
 * (Provider 는 fetch 하지 않는다 — 저장/조회만.)
 */
export interface PatientsContextValue {
  patients: DashboardPatient[];
  /** stayId(UUID) → DashboardPatient. 알림 stay_id 매칭에 사용. */
  patientByStayId: Map<string, DashboardPatient>;
  /** 이미 받아온 목록을 캐시에 저장 (OverviewPage 가 호출). */
  setPatients: (list: DashboardPatient[]) => void;
}

export const PatientsCtx = createContext<PatientsContextValue | null>(null);
