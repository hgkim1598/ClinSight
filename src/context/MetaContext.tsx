/**
 * MetaContext — Provider only.
 *
 * - context 객체는 `./metaContextObj`에서 export.
 * - hook(useMeta/useMe)은 `./useMeta`에서 export.
 *   (react-refresh 규칙: 컴포넌트 파일은 컴포넌트만 export).
 */
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Me, Metric, ModelMeta } from '../types';
import { getMe, getMetrics, getModels } from '../api/services/metaService';
import { MetaCtx, type MetaContextValue } from './metaContextObj';

export function MetaProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [m, mt, mo] = await Promise.all([getMe(), getMetrics(), getModels()]);
        if (cancelled) return;
        setMe(m);
        setMetrics(mt);
        setModels(mo);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<MetaContextValue>(() => {
    const metricByCode = metrics.reduce<Record<string, Metric>>((acc, m) => {
      acc[m.configKey] = m;
      return acc;
    }, {});
    const modelByKey = models.reduce<Record<string, ModelMeta>>((acc, m) => {
      acc[m.modelKey] = m;
      return acc;
    }, {});
    const modelByTarget = models.reduce<Record<string, ModelMeta>>((acc, m) => {
      acc[m.targetName] = m;
      return acc;
    }, {});
    const isModelInput = (modelKey: string, metricCode: string) => {
      const model = modelByKey[modelKey];
      return Boolean(model?.inputFeatures.includes(metricCode));
    };
    return {
      me, metrics, models, loading,
      metricByCode, modelByKey, modelByTarget, isModelInput,
    };
  }, [me, metrics, models, loading]);

  return <MetaCtx.Provider value={value}>{children}</MetaCtx.Provider>;
}
