import { createContext } from 'react';
import type { ClinicalObservation, RawMetric } from '../types';

export interface ClinicalDataContextValue {
  /** 현재 캐시된 stay_token. 다른 stayId 진입 시 새 데이터로 교체된다. */
  stayId: string;
  observations: ClinicalObservation[];
  period: { from: string; to: string };
  /** Provider 내부의 fetch 상태. */
  loading: boolean;
  /** 마지막 fetch 실패 정보. 성공 시 null. */
  error: unknown;
  /** 사용자가 수동으로 재시도할 수 있도록 노출. */
  refetch: () => void;
  /**
   * 특정 모델의 input_features에 따라 RawMetric[]를 가공해 돌려준다.
   *  - 모델별로 isModelInput 라벨이 결정된다.
   *  - 같은 metric_code의 가장 최근 관측만 반환.
   *  - MetaContext의 metricByCode 조회 결과를 활용.
   */
  buildRawForModel: (apiModelKey: string) => RawMetric[];
}

export const ClinicalDataCtx = createContext<ClinicalDataContextValue | null>(null);
