/**
 * Model Prediction Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/models.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /patients/{id}/predictions
 *      → 백엔드에서 5개 row를 Record<ModelKey, ModelPrediction>로 reduce
 *
 * 참고: docs/DYNAMO_SCHEMA.md §7 ModelPredictions
 */
import type { ModelKey, ModelPrediction } from '../../types';
import { modelPredictions } from '../mock/models';

const fallback: Record<ModelKey, ModelPrediction> = {
  mortality: {
    title: '사망 위험',
    tone: 'safe',
    trend: [],
    trendWarn: { delta: '', note: '' },
    shap: [],
    raw: [],
    llmSummary: '',
  },
  aki: {
    title: '급성 신손상 (AKI)',
    tone: 'safe',
    trend: [],
    trendWarn: { delta: '', note: '' },
    shap: [],
    raw: [],
    llmSummary: '',
  },
  ards: {
    title: '급성호흡곤란증후군 (ARDS)',
    tone: 'safe',
    trend: [],
    trendWarn: { delta: '', note: '' },
    shap: [],
    raw: [],
    llmSummary: '',
  },
  sic: {
    title: '패혈증 유발 응고장애 (SIC)',
    tone: 'safe',
    trend: [],
    trendWarn: { delta: '', note: '' },
    shap: [],
    raw: [],
    llmSummary: '',
  },
  shock: {
    title: '패혈성 쇼크 (Septic Shock)',
    tone: 'safe',
    trend: [],
    trendWarn: { delta: '', note: '' },
    shap: [],
    raw: [],
    llmSummary: '',
  },
};

export async function getModelPredictions(
  patientId: string,
): Promise<Record<ModelKey, ModelPrediction>> {
  return modelPredictions[patientId] ?? fallback;
}
