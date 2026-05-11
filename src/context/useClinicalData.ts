import { useContext } from 'react';
import { ClinicalDataCtx, type ClinicalDataContextValue } from './clinicalDataContextObj';

/**
 * ClinicalDataProvider 안에서만 사용. 외부면 throw.
 * PatientPage 트리 안에서 호출하는 것이 표준 경로.
 */
export function useClinicalData(): ClinicalDataContextValue {
  const v = useContext(ClinicalDataCtx);
  if (!v) {
    throw new Error('useClinicalData must be used within ClinicalDataProvider');
  }
  return v;
}

/**
 * Provider 밖에서도 안전하게 호출하고 싶을 때 사용. 없으면 null 반환.
 * (DrilldownPage 등 추후 트리 외부에서도 fallback 동작이 필요한 케이스용.)
 */
export function useClinicalDataOptional(): ClinicalDataContextValue | null {
  return useContext(ClinicalDataCtx);
}
