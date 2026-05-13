/**
 * ClinicalDataProvider — 환자 상세 트리에서 `/clinical-data`를 한 번만 호출하고
 * 하위 컴포넌트(VitalChart, ModelDetailView)가 공유한다.
 *
 * - fetch 소유권은 본 Provider 에 있다. 호출자(PatientPage)는 `useClinicalData()`로만 소비.
 * - PatientPage는 Provider에 `key={stayId}`를 줘 stay 변경 시 자연 remount되도록 한다.
 *   덕분에 useState의 초기값이 자동으로 "캐시 리셋"을 담당하고, effect body 안에서
 *   synchronous setState를 호출할 필요가 없다 (react-hooks/set-state-in-effect 회피).
 * - buildRawForModel(apiModelKey)로 특정 모델의 RawMetric[]을 산출.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  ClinicalObservation,
  Metric,
  ModelMeta,
  RawMetric,
} from '../types';
import { getClinicalData } from '../api/services/vitalService';
import { useMeta } from './useMeta';
import { toRelativeLabel } from '../utils/time';
import {
  ClinicalDataCtx,
  type ClinicalDataContextValue,
} from './clinicalDataContextObj';

interface ClinicalDataProviderProps {
  stayId: string;
  children: ReactNode;
}

/**
 * 임상 관행상 항상 정수로 표시하는 metric (피드백 §2-1, §3-1).
 * modelService와 동일한 화이트리스트를 유지한다.
 */
const INTEGER_METRICS = new Set<string>([
  'hr', 'rr', 'spo2', 'map', 'nibp_map', 'abp_map', 'gcs',
  'urine_output', 'intake_volume',
  'wbc', 'platelet', 'bun', 'fibrinogen',
  'sofa_total', 'age',
]);

function formatMetricValue(metricCode: string, v: number): string {
  if (INTEGER_METRICS.has(metricCode)) return `${Math.round(v)}`;
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(2).replace(/\.?0+$/, '');
}

function pickLatestPerMetric(
  observations: ClinicalObservation[],
): Map<string, ClinicalObservation> {
  const latest = new Map<string, ClinicalObservation>();
  for (const o of observations) {
    const prev = latest.get(o.metricCode);
    if (!prev || o.observedAt > prev.observedAt) {
      latest.set(o.metricCode, o);
    }
  }
  return latest;
}

function buildRaw(
  observations: ClinicalObservation[],
  apiModelKey: string,
  modelByKey: Record<string, ModelMeta>,
  metricByCode: Record<string, Metric>,
  referenceNowIso: string,
): RawMetric[] {
  const model = modelByKey[apiModelKey];
  const inputFeatures = model?.inputFeatures ?? [];
  const latestByCode = pickLatestPerMetric(observations);

  const result: RawMetric[] = [];
  for (const [code, obs] of latestByCode) {
    const metric = metricByCode[code];
    const isModelInput = inputFeatures.includes(code);
    // 모델 입력 또는 표시용 기본 metric은 노출. 그 외에는 모델 입력만 노출.
    if (!isModelInput && !metric) continue;
    result.push({
      label: metric?.displayName ?? code,
      value: formatMetricValue(code, obs.numericValue),
      unit: obs.unit,
      time: toRelativeLabel(obs.observedAt, referenceNowIso),
      isModelInput,
      metricCode: code,
    });
  }
  // model input을 위로
  result.sort((a, b) => {
    if (a.isModelInput === b.isModelInput) return a.label.localeCompare(b.label);
    return a.isModelInput ? -1 : 1;
  });
  return result;
}

export function ClinicalDataProvider({
  stayId,
  children,
}: ClinicalDataProviderProps) {
  const { modelByKey, metricByCode } = useMeta();
  // 초기값이 "캐시 리셋"을 담당. stayId 변경 시 PatientPage가 key={stayId}로 remount하므로
  // 별도 동기 reset이 필요 없다.
  const [observations, setObservations] = useState<ClinicalObservation[]>([]);
  const [period, setPeriod] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  /** refetch 트리거. 값 변화로 effect 재실행. */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getClinicalData(stayId);
        if (cancelled) return;
        setObservations(data.observations);
        setPeriod(data.period);
        setError(null);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stayId, reloadKey]);

  const refetch = useCallback(() => {
    // event handler 안에서의 setState — effect body 밖이므로 lint 룰에 걸리지 않음.
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const value = useMemo<ClinicalDataContextValue>(() => {
    const referenceNowIso =
      observations.reduce<string>(
        (acc, o) => (o.observedAt > acc ? o.observedAt : acc),
        '',
      ) || new Date().toISOString();
    return {
      stayId,
      observations,
      period,
      loading,
      error,
      refetch,
      buildRawForModel: (apiModelKey: string) =>
        buildRaw(observations, apiModelKey, modelByKey, metricByCode, referenceNowIso),
    };
  }, [stayId, observations, period, loading, error, refetch, modelByKey, metricByCode]);

  return (
    <ClinicalDataCtx.Provider value={value}>{children}</ClinicalDataCtx.Provider>
  );
}
