import { createContext } from 'react';
import type { Me, Metric, ModelMeta } from '../types';

export interface MetaContextValue {
  me: Me | null;
  metrics: Metric[];
  models: ModelMeta[];
  loading: boolean;
  /** metric_code → Metric. SHAP display 조립 + RawMetric 라벨에 사용. */
  metricByCode: Record<string, Metric>;
  /** API model_key('mortality_48h' 등) → ModelMeta. */
  modelByKey: Record<string, ModelMeta>;
  /** target_name('mortality' 등) → ModelMeta. UI 카드 그룹핑에 사용. */
  modelByTarget: Record<string, ModelMeta>;
  /** model_key + metric_code가 input_features에 포함되는지. */
  isModelInput: (modelKey: string, metricCode: string) => boolean;
}

export const MetaCtx = createContext<MetaContextValue | null>(null);
