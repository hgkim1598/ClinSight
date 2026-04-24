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

export function getModelPredictions(patientId: string): Record<ModelKey, ModelPrediction> {
  return modelPredictions[patientId] ?? fallback;
}
