/**
 * Model Prediction Service
 *
 *  - GET /icu-stays/{stayId}/predictions                    → getLatestPredictions()
 *  - GET /icu-stays/{stayId}/predictions/{modelKey}         → getLatestPrediction()
 *  - GET /icu-stays/{stayId}/predictions/{modelKey}/history → getPredictionHistory()
 *
 * 호환 함수 getModelPredictions(stayId)는 컴포넌트가 소비하는 view-model
 * (Record<TargetName, ModelPrediction>)을 latestToView()로 조립해 반환한다.
 * mock 모드에서도 동일한 변환 경로를 거쳐 mock 데이터로 변환 로직을 검증할 수 있다.
 *
 * 변환 입력:
 *   - LatestPrediction[]    (메인 5 + 보조 2)
 *   - PredictionHistory     (모델별 7개 시점)
 *   - WireRawPoint[]        (모델 카드 우측 Raw 임상지표 — mock 임베드, 실제는 /clinical-data 조회)
 *   - llmSummary            (mock 임베드, 실제는 /ai/insights 조회)
 *   - Metric[] + ModelMeta[] (meta로 SHAP display 조립 + isModelInput)
 */
import type {
  ApiModelKey,
  EscalationNeed,
  EscalationPrediction,
  EscalationTarget,
  LatestPrediction,
  Metric,
  ModelMeta,
  ModelPrediction,
  PredictionHistory,
  PredictionHistoryPoint,
  RawMetric,
  RiskLevel,
  RiskTone,
  ShapFactor,
  ShapFeature,
  TargetName,
  TrendPoint,
  TrendWarning,
} from '../../types';
import { MOCK_MODE, request } from '../client';
import {
  mockClinicalForModelByStay,
  mockHistoryByStayAndModel,
  mockLatestByStay,
  mockLlmSummaryByStayAndTarget,
  type WireHistoryPoint,
  type WireLatestPrediction,
  type WireRawPoint,
  type WireShapFactor,
} from '../mock/models';
import { getMetrics, getModels } from './metaService';
import { riskLabelToTone } from '../../utils/constants';
import { toRelativeLabel } from '../../utils/time';

// -------- wire 매핑 (snake → camel) --------

function mapShapFactor(w: WireShapFactor): ShapFactor {
  return {
    feature: w.feature,
    value: w.value,
    direction: w.direction === 'decrease' ? 'decrease' : 'increase',
    contribution: w.contribution,
  };
}

function mapLatest(w: WireLatestPrediction): LatestPrediction {
  return {
    predictionId: w.prediction_id,
    modelKey: w.model_key,
    modelVersion: w.model_version,
    targetName: w.target_name,
    horizonHours: w.horizon_hours,
    riskScore: w.risk_score,
    riskLabel: w.risk_label,
    threshold: w.threshold,
    predictedAt: w.predicted_at,
    featureWindowStart: w.feature_window_start,
    featureWindowEnd: w.feature_window_end,
    topFactors: w.top_factors_jsonb.map(mapShapFactor),
    status: w.status,
  };
}

function mapHistoryPoint(w: WireHistoryPoint): PredictionHistoryPoint {
  return {
    predictionId: w.prediction_id,
    riskScore: w.risk_score,
    riskLabel: w.risk_label,
    predictedAt: w.predicted_at,
    status: w.status,
  };
}

// -------- wire API --------

export async function getLatestPredictions(stayId: string): Promise<LatestPrediction[]> {
  if (MOCK_MODE) {
    return (mockLatestByStay[stayId] ?? []).map(mapLatest);
  }
  const w = await request<{ stay_token: string; predictions: WireLatestPrediction[] }>(
    `/icu-stays/${encodeURIComponent(stayId)}/predictions`,
  );
  return w.predictions.map(mapLatest);
}

export async function getLatestPrediction(
  stayId: string,
  modelKey: ApiModelKey,
): Promise<LatestPrediction | null> {
  if (MOCK_MODE) {
    const found = (mockLatestByStay[stayId] ?? []).find((p) => p.model_key === modelKey);
    return found ? mapLatest(found) : null;
  }
  const w = await request<WireLatestPrediction>(
    `/icu-stays/${encodeURIComponent(stayId)}/predictions/${encodeURIComponent(modelKey)}`,
  );
  return mapLatest(w);
}

export async function getPredictionHistory(
  stayId: string,
  modelKey: ApiModelKey,
): Promise<PredictionHistory> {
  if (MOCK_MODE) {
    const arr = mockHistoryByStayAndModel[stayId]?.[modelKey] ?? [];
    return { stayToken: stayId, modelKey, history: arr.map(mapHistoryPoint) };
  }
  const w = await request<{
    stay_token: string;
    model_key: ApiModelKey;
    history: WireHistoryPoint[];
  }>(`/icu-stays/${encodeURIComponent(stayId)}/predictions/${encodeURIComponent(modelKey)}/history`);
  return {
    stayToken: w.stay_token,
    modelKey: w.model_key,
    history: w.history.map(mapHistoryPoint),
  };
}

// -------- 프론트 파생: trendWarning --------

/**
 * history 배열에서 trend warning(delta/note)을 계산한다.
 * (API에 포함하지 않음 — 프론트 파생 결정)
 */
export function computeTrendWarning(history: PredictionHistoryPoint[]): TrendWarning {
  if (history.length < 2) return { delta: '', note: '' };
  const sorted = [...history].sort((a, b) => a.predictedAt.localeCompare(b.predictedAt));
  const first = sorted[0].riskScore;
  const last = sorted[sorted.length - 1].riskScore;
  const deltaPct = Math.round((last - first) * 100);
  const sign = deltaPct >= 0 ? '+' : '';
  const delta = `${sign}${deltaPct}%p`;
  const note =
    deltaPct >= 15
      ? '최근 추세에서 위험이 빠르게 상승 중입니다. 평가 필요.'
      : deltaPct <= -15
        ? '위험도가 감소하는 양상입니다. 관찰 지속.'
        : '위험도 변화가 안정적입니다.';
  return { delta, note };
}

// -------- SHAP display 조립 --------

function composeShapDisplay(
  factor: ShapFactor,
  metricByCode: Record<string, Metric>,
): ShapFeature {
  const metric = metricByCode[factor.feature];
  let name: string;
  if (metric) {
    const displayName = metric.displayName;
    const unit = metric.unit;
    if (factor.feature === 'vasopressor_use') {
      // 이진 feature: 값 대신 상태 표시
      name = factor.value > 0 ? `${displayName}` : `${displayName} 없음`;
    } else {
      const valueText = formatMetricValue(factor.feature, factor.value);
      name = unit ? `${displayName} ${valueText} ${unit}` : `${displayName} ${valueText}`;
    }
  } else {
    name = `${factor.feature} ${formatMetricValue(factor.feature, factor.value)}`;
  }
  return {
    name,
    value: factor.contribution,
    direction: factor.direction === 'increase' ? 'up' : 'down',
    contribution: factor.contribution,
  };
}

function formatNumber(v: number): string {
  if (Number.isInteger(v)) return `${v}`;
  // 소수 1자리, 끝의 0 제거
  return v.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * 임상 관행상 항상 정수로 표시하는 metric 화이트리스트.
 * (피드백 §2-1, §3-1 — HR/RR/SpO2 등은 소수점 없음)
 */
const INTEGER_METRICS = new Set<string>([
  'hr', 'rr', 'spo2', 'map', 'nibp_map', 'abp_map', 'gcs',
  'urine_output', 'intake_volume',
  'wbc', 'platelet', 'bun', 'fibrinogen',
  'sofa_total', 'age',
]);

/** metric_code 기반 표시 자릿수 강제. 정수 metric은 Math.round 반올림. */
function formatMetricValue(metricCode: string, v: number): string {
  if (INTEGER_METRICS.has(metricCode)) return `${Math.round(v)}`;
  return formatNumber(v);
}

// -------- Raw 임상지표 view-model 조립 --------

function buildRawMetrics(
  rawPoints: WireRawPoint[],
  target: TargetName,
  metricByCode: Record<string, Metric>,
  inputFeatures: string[],
  referenceNowIso: string,
): RawMetric[] {
  const filtered = rawPoints.filter((p) => p.target === target);
  return filtered.map((p) => {
    const metric = metricByCode[p.metric_code];
    const label = metric?.displayName ?? p.metric_code;
    return {
      label,
      value: formatMetricValue(p.metric_code, p.numeric_value),
      unit: p.unit,
      time: toRelativeLabel(p.observed_at, referenceNowIso),
      isModelInput: inputFeatures.includes(p.metric_code),
      metricCode: p.metric_code,
    };
  });
}

// -------- escalation 빌드 --------

const ESCALATION_PARENT: Record<EscalationTarget, TargetName> = {
  invasive_vent: 'ards',
  vasopressor: 'shock',
};

const ESCALATION_LABEL: Record<EscalationTarget, { title: string; shortLabel: string }> = {
  invasive_vent: { title: '침습적 기계환기 (InvasiveVent)', shortLabel: 'InvasiveVent' },
  vasopressor: { title: '승압제 (Vasopressor)', shortLabel: 'Vasopressor' },
};

function buildEscalation(
  pred: LatestPrediction,
  metricByCode: Record<string, Metric>,
  need: EscalationNeed,
): EscalationPrediction {
  const target = pred.targetName as EscalationTarget;
  const meta = ESCALATION_LABEL[target] ?? { title: target, shortLabel: target };
  return {
    title: meta.title,
    shortLabel: meta.shortLabel,
    probability: Math.round(pred.riskScore * 100),
    need,
    shap: pred.topFactors.map((f) => composeShapDisplay(f, metricByCode)),
  };
}

// -------- LatestPrediction[] → 컴포넌트 view-model --------

const TARGETS: TargetName[] = ['mortality', 'aki', 'ards', 'sic', 'shock'];

const FALLBACK_TITLE: Record<TargetName, string> = {
  mortality: '사망 위험',
  aki: '급성 신손상 (AKI)',
  ards: '급성호흡곤란증후군 (ARDS)',
  sic: '패혈증 유발 응고장애 (SIC)',
  shock: '패혈성 쇼크 (Septic Shock)',
};

interface LatestToViewInput {
  latest: LatestPrediction[];
  historyByModelKey: Record<string, PredictionHistoryPoint[]>;
  rawPoints: WireRawPoint[];
  llmSummaryByTarget: Partial<Record<TargetName, string>>;
  /**
   * 보조지표 필요 가능성 override (옵션).
   * 미지정 시 predictions의 invasive_vent_12h/vasopressor_12h risk_label로 자동 파생.
   */
  escalationNeed?: Partial<Record<EscalationTarget, EscalationNeed>>;
  metrics: Metric[];
  models: ModelMeta[];
  referenceNowIso: string;
}

/**
 * 보조지표(invasive_vent, vasopressor)의 "필요 가능성"을 predictions에서 파생한다.
 *
 *  - risk_label === 'high' → `highNeed` (12시간 내 해당 치료가 필요할 가능성이 높다고 예측)
 *  - 그 외 → `lowNeed`
 *
 * ⚠️ 이 값은 "현재 사용 중"이 아니라 "예측 기반 필요 가능성"이다.
 *    실제 사용 여부는 clinical_observations(vasopressor_in_use 등)에서 별도 파생해야 함.
 */
function deriveEscalationNeed(
  byTarget: Partial<Record<TargetName | EscalationTarget, LatestPrediction>>,
): Record<EscalationTarget, EscalationNeed> {
  const inv = byTarget.invasive_vent;
  const vaso = byTarget.vasopressor;
  return {
    invasive_vent: inv?.riskLabel === 'high' ? 'highNeed' : 'lowNeed',
    vasopressor: vaso?.riskLabel === 'high' ? 'highNeed' : 'lowNeed',
  };
}

/**
 * API/mock에서 받은 wire 객체들을 모아 컴포넌트가 소비하는 view-model로 조립.
 */
export function latestToView(input: LatestToViewInput): Record<TargetName, ModelPrediction> {
  const {
    latest, historyByModelKey, rawPoints, llmSummaryByTarget,
    escalationNeed, metrics, models, referenceNowIso,
  } = input;

  const metricByCode = metrics.reduce<Record<string, Metric>>((acc, m) => {
    acc[m.configKey] = m;
    return acc;
  }, {});
  const modelByTarget = models.reduce<Record<string, ModelMeta>>((acc, m) => {
    acc[m.targetName] = m;
    return acc;
  }, {});

  // target_name으로 인덱싱
  const byTarget: Partial<Record<TargetName | EscalationTarget, LatestPrediction>> = {};
  for (const pred of latest) {
    byTarget[pred.targetName] = pred;
  }

  // escalation 필요 가능성: 호출자가 override 안 했으면 predictions에서 파생
  const resolvedEscalationNeed =
    escalationNeed && Object.keys(escalationNeed).length > 0
      ? escalationNeed
      : deriveEscalationNeed(byTarget);

  const result = {} as Record<TargetName, ModelPrediction>;

  for (const target of TARGETS) {
    const pred = byTarget[target];
    const model = modelByTarget[target];
    const inputFeatures = model?.inputFeatures ?? [];
    const title = model?.modelName ?? FALLBACK_TITLE[target];

    if (!pred) {
      result[target] = {
        title,
        tone: 'safe',
        riskLabel: 'low',
        riskScorePct: 0,
        trend: [],
        trendWarn: { delta: '', note: '' },
        shap: [],
        raw: buildRawMetrics(rawPoints, target, metricByCode, inputFeatures, referenceNowIso),
        llmSummary: llmSummaryByTarget[target] ?? '',
      };
      continue;
    }

    const history = historyByModelKey[pred.modelKey] ?? [];
    const shap = pred.topFactors.map((f) => composeShapDisplay(f, metricByCode));

    // dedup: latest와 같은 prediction을 history에서도 발견하면 중복으로 간주.
    //  - 1순위: predictionId 일치 (가장 신뢰도 높음)
    //  - 2순위: predictedAt 일치 (모델 키는 이미 history 분기 자체로 동일)
    const isSameAsLatest = (h: PredictionHistoryPoint) =>
      h.predictionId === pred.predictionId || h.predictedAt === pred.predictedAt;

    // trend: history 시점을 ref 기준 상대시간 + pct(0~100)로 변환.
    const sorted = history.slice().sort((a, b) => a.predictedAt.localeCompare(b.predictedAt));
    const includesLatest = sorted.some(isSameAsLatest);
    const trend: TrendPoint[] = sorted.map((h) => ({
      t: toRelativeLabel(h.predictedAt, referenceNowIso),
      pct: Math.round(h.riskScore * 100),
      // 가장 최신 history point에만 SHAP 동봉 (API는 history에 SHAP 미제공 결정).
      shap: isSameAsLatest(h) ? shap : undefined,
    }));
    if (!includesLatest) {
      trend.push({
        t: toRelativeLabel(pred.predictedAt, referenceNowIso),
        pct: Math.round(pred.riskScore * 100),
        shap,
      });
    }

    const riskLabel: RiskLevel = pred.riskLabel;
    const tone: RiskTone = riskLabelToTone(riskLabel);

    const card: ModelPrediction = {
      title,
      tone,
      riskLabel,
      riskScorePct: Math.round(pred.riskScore * 100),
      trend,
      trendWarn: computeTrendWarning(history),
      shap,
      raw: buildRawMetrics(rawPoints, target, metricByCode, inputFeatures, referenceNowIso),
      llmSummary: llmSummaryByTarget[target] ?? '',
    };

    // 보조지표 결합: ards ← invasive_vent, shock ← vasopressor
    const escalation = Object.entries(ESCALATION_PARENT).find(
      ([, parent]) => parent === target,
    );
    if (escalation) {
      const [esTarget] = escalation as [EscalationTarget, TargetName];
      const esPred = byTarget[esTarget];
      if (esPred) {
        card.escalation = buildEscalation(
          esPred,
          metricByCode,
          resolvedEscalationNeed[esTarget] ?? 'lowNeed',
        );
      }
    }

    result[target] = card;
  }

  return result;
}

// -------- public façade --------

/**
 * 컴포넌트가 소비하는 view-model.
 * mock/실제 모두 동일한 latestToView() 경로를 거친다.
 */
export async function getModelPredictions(
  stayId: string,
): Promise<Record<TargetName, ModelPrediction>> {
  const [latest, metrics, models] = await Promise.all([
    getLatestPredictions(stayId),
    getMetrics(),
    getModels(),
  ]);

  // 모델별 history는 메인 5 + 보조 2 each fetched.
  // mock에서는 전부 동기 lookup이라 비용이 거의 없고, 실제 환경에서도 환자 상세
  // 한 번 진입 시 7회 fetch는 허용 범위 (각각 50개 limit).
  const historyEntries = await Promise.all(
    latest.map((p) =>
      getPredictionHistory(stayId, p.modelKey).then(
        (h) => [p.modelKey, h.history] as const,
      ),
    ),
  );
  const historyByModelKey = historyEntries.reduce<Record<string, PredictionHistoryPoint[]>>(
    (acc, [k, v]) => {
      acc[k] = v;
      return acc;
    },
    {},
  );

  const rawPoints = MOCK_MODE
    ? (mockClinicalForModelByStay[stayId] ?? [])
    : []; // 실제 환경: /clinical-data 호출로 별도 채움 (Phase 3 — Raw 카드 활성화 시점에 결선)

  const llmSummaryByTarget = MOCK_MODE
    ? (mockLlmSummaryByStayAndTarget[stayId] ?? {})
    : {}; // 실제 환경: /ai/insights 호출 결과로 채움

  // escalationNeed는 latestToView 안에서 predictions(invasive_vent_12h, vasopressor_12h)에서 파생.
  // 별도 endpoint 없이 같은 /predictions 응답으로부터 결정.

  const referenceNowIso =
    latest.reduce<string>(
      (acc, p) => (p.predictedAt > acc ? p.predictedAt : acc),
      '',
    ) || new Date().toISOString();

  return latestToView({
    latest,
    historyByModelKey,
    rawPoints,
    llmSummaryByTarget,
    metrics,
    models,
    referenceNowIso,
  });
}
