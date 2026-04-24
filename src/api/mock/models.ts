import type { ModelKey, ModelPrediction } from '../../types';

type PatientModels = Record<ModelKey, ModelPrediction>;

const emptyPrediction = (title: string, tone: ModelPrediction['tone']): ModelPrediction => ({
  title,
  tone,
  trend: [],
  trendWarn: { delta: '', note: '' },
  shap: [],
  raw: [],
  llmSummary: '',
});

const pt19482: PatientModels = {
  mortality: {
    title: '사망 위험',
    tone: 'danger',
    trend: [
      { t: '-6h', pct: 48 },
      { t: '-5h', pct: 52 },
      { t: '-4h', pct: 55 },
      { t: '-3h', pct: 61 },
      { t: '-2h', pct: 68 },
      { t: '-1h', pct: 72 },
      { t: '현재', pct: 74 },
    ],
    trendWarn: {
      delta: '+26%p',
      note: '최근 6시간 동안 위험이 빠르게 상승 중입니다. 평가 필요.',
    },
    shap: [
      { name: 'Lactate 5.2 mmol/L', value: 0.28, direction: 'up' },
      { name: 'MAP 58 mmHg', value: 0.21, direction: 'up' },
      { name: 'SOFA 12', value: 0.18, direction: 'up' },
      { name: 'Age 72', value: 0.09, direction: 'up' },
      { name: 'PaO2/FiO2 180', value: 0.07, direction: 'up' },
    ],
    raw: [
      { label: 'Lactate', value: '5.2', unit: 'mmol/L', time: '-30m', isModelInput: true },
      { label: 'MAP', value: '58', unit: 'mmHg', time: '-15m', isModelInput: true },
      { label: 'HR', value: '124', unit: 'bpm', time: '-10m', isModelInput: true },
      { label: 'SpO2', value: '91', unit: '%', time: '-10m', isModelInput: true },
      { label: 'Temp', value: '38.9', unit: '°C', time: '-20m', isModelInput: false },
      { label: 'WBC', value: '18.4', unit: 'x10^3/µL', time: '-1h', isModelInput: false },
    ],
    llmSummary:
      '혈압 저하와 lactate 상승이 동반되며 장기부전 지표가 빠르게 악화되는 패턴입니다. 원인 감염 제어와 관류 회복에 대한 평가가 필요합니다. 본 텍스트는 AI 생성이며 임상 판단을 대체하지 않습니다.',
  },
  aki: {
    title: '급성 신손상 (AKI)',
    tone: 'danger',
    trend: [
      { t: '-6h', pct: 41 },
      { t: '-5h', pct: 46 },
      { t: '-4h', pct: 52 },
      { t: '-3h', pct: 58 },
      { t: '-2h', pct: 62 },
      { t: '-1h', pct: 65 },
      { t: '현재', pct: 68 },
    ],
    trendWarn: {
      delta: '+27%p',
      note: '소변량 감소와 크레아티닌 상승이 관찰됩니다. 관찰 중.',
    },
    shap: [
      { name: 'Urine output 0.3 mL/kg/h', value: 0.24, direction: 'up' },
      { name: 'Creatinine 2.1 mg/dL', value: 0.22, direction: 'up' },
      { name: 'MAP 58 mmHg', value: 0.15, direction: 'up' },
      { name: 'Vasopressor use', value: 0.11, direction: 'up' },
      { name: 'Age 72', value: 0.06, direction: 'up' },
    ],
    raw: [
      { label: 'Creatinine', value: '2.1', unit: 'mg/dL', time: '-1h', isModelInput: true },
      { label: 'Urine output', value: '0.3', unit: 'mL/kg/h', time: '-1h', isModelInput: true },
      { label: 'BUN', value: '38', unit: 'mg/dL', time: '-1h', isModelInput: true },
      { label: 'K+', value: '5.1', unit: 'mmol/L', time: '-1h', isModelInput: false },
    ],
    llmSummary:
      '소변량 감소와 신기능 지표 악화가 진행 중이며, 관류 저하와 연관된 패턴으로 보입니다. 수액/승압제 반응 평가가 필요합니다.',
  },
  ards: {
    title: '급성호흡곤란증후군 (ARDS)',
    tone: 'warn',
    trend: [
      { t: '-6h', pct: 32 },
      { t: '-5h', pct: 34 },
      { t: '-4h', pct: 38 },
      { t: '-3h', pct: 42 },
      { t: '-2h', pct: 45 },
      { t: '-1h', pct: 48 },
      { t: '현재', pct: 51 },
    ],
    trendWarn: {
      delta: '+19%p',
      note: '산소화 지표 악화 추세. 영상 검사 등 추가 평가 필요.',
    },
    shap: [
      { name: 'PaO2/FiO2 180', value: 0.26, direction: 'up' },
      { name: 'SpO2 91%', value: 0.18, direction: 'up' },
      { name: 'Respiratory rate 28', value: 0.12, direction: 'up' },
      { name: 'FiO2 0.6', value: 0.09, direction: 'up' },
      { name: 'Lactate 5.2', value: 0.05, direction: 'up' },
    ],
    raw: [
      { label: 'PaO2/FiO2', value: '180', unit: '', time: '-30m', isModelInput: true },
      { label: 'SpO2', value: '91', unit: '%', time: '-10m', isModelInput: true },
      { label: 'FiO2', value: '60', unit: '%', time: '-10m', isModelInput: true },
      { label: 'RR', value: '28', unit: '/min', time: '-10m', isModelInput: true },
      { label: 'Chest X-ray', value: '양측 침윤', unit: '', time: '-3h', isModelInput: false },
    ],
    llmSummary:
      '산소화 저하와 호흡수 증가가 동반되어 호흡부전 악화 가능성이 평가 필요합니다. 침습적 기계환기 전환 준비 여부를 판단하십시오.',
  },
  sic: {
    title: '패혈증 유발 응고장애 (SIC)',
    tone: 'warn',
    trend: [
      { t: '-6h', pct: 28 },
      { t: '-5h', pct: 30 },
      { t: '-4h', pct: 33 },
      { t: '-3h', pct: 36 },
      { t: '-2h', pct: 39 },
      { t: '-1h', pct: 42 },
      { t: '현재', pct: 44 },
    ],
    trendWarn: {
      delta: '+16%p',
      note: '혈소판 감소와 PT 연장이 동반됩니다. 관찰 중.',
    },
    shap: [
      { name: 'Platelet 92 x10^3', value: 0.22, direction: 'up' },
      { name: 'PT-INR 1.8', value: 0.18, direction: 'up' },
      { name: 'SOFA 12', value: 0.11, direction: 'up' },
      { name: 'D-dimer 6.2', value: 0.09, direction: 'up' },
      { name: 'Fibrinogen 180', value: 0.05, direction: 'up' },
    ],
    raw: [
      { label: 'Platelet', value: '92', unit: 'x10^3/µL', time: '-1h', isModelInput: true },
      { label: 'PT-INR', value: '1.8', unit: '', time: '-1h', isModelInput: true },
      { label: 'D-dimer', value: '6.2', unit: 'µg/mL', time: '-1h', isModelInput: true },
      { label: 'Fibrinogen', value: '180', unit: 'mg/dL', time: '-1h', isModelInput: false },
    ],
    llmSummary:
      '응고 지표가 점진적으로 악화되어 SIC 발생 가능성이 증가하는 양상입니다. 추가 혈액검사 및 출혈 위험 평가가 권고됩니다.',
  },
  shock: {
    title: '패혈성 쇼크 (Septic Shock)',
    tone: 'danger',
    trend: [
      { t: '-6h', pct: 44 },
      { t: '-5h', pct: 50 },
      { t: '-4h', pct: 55 },
      { t: '-3h', pct: 60 },
      { t: '-2h', pct: 64 },
      { t: '-1h', pct: 68 },
      { t: '현재', pct: 71 },
    ],
    trendWarn: {
      delta: '+27%p',
      note: '저혈압과 lactate 상승이 지속됩니다. 평가 필요.',
    },
    shap: [
      { name: 'MAP 58 mmHg', value: 0.27, direction: 'up' },
      { name: 'Lactate 5.2', value: 0.23, direction: 'up' },
      { name: 'HR 124', value: 0.14, direction: 'up' },
      { name: 'Fluid balance +2.4L', value: 0.08, direction: 'up' },
      { name: 'Temp 38.9', value: 0.04, direction: 'up' },
    ],
    raw: [
      { label: 'MAP', value: '58', unit: 'mmHg', time: '-15m', isModelInput: true },
      { label: 'Lactate', value: '5.2', unit: 'mmol/L', time: '-30m', isModelInput: true },
      { label: 'HR', value: '124', unit: 'bpm', time: '-10m', isModelInput: true },
      { label: 'CVP', value: '10', unit: 'mmHg', time: '-30m', isModelInput: false },
      { label: 'Fluid balance', value: '+2.4', unit: 'L', time: '-1h', isModelInput: false },
    ],
    llmSummary:
      '수액 소생에도 평균동맥압이 회복되지 않고 lactate가 상승합니다. 승압제 요구 가능성에 대한 평가가 필요합니다.',
  },
};

const simple = (tone: ModelPrediction['tone']): ModelPrediction => ({
  title: '',
  tone,
  trend: [],
  trendWarn: { delta: '', note: '' },
  shap: [],
  raw: [],
  llmSummary: '',
});

const buildSimpleSet = (tones: Record<ModelKey, ModelPrediction['tone']>): PatientModels => ({
  mortality: { ...simple(tones.mortality), title: '사망 위험' },
  aki: { ...simple(tones.aki), title: '급성 신손상 (AKI)' },
  ards: { ...simple(tones.ards), title: '급성호흡곤란증후군 (ARDS)' },
  sic: { ...simple(tones.sic), title: '패혈증 유발 응고장애 (SIC)' },
  shock: { ...simple(tones.shock), title: '패혈성 쇼크 (Septic Shock)' },
});

export const modelPredictions: Record<string, PatientModels> = {
  'PT-19482': pt19482,
  'PT-20314': buildSimpleSet({
    mortality: 'danger',
    aki: 'warn',
    ards: 'danger',
    sic: 'warn',
    shock: 'warn',
  }),
  'PT-20781': buildSimpleSet({
    mortality: 'warn',
    aki: 'warn',
    ards: 'warn',
    sic: 'safe',
    shock: 'warn',
  }),
  'PT-21005': buildSimpleSet({
    mortality: 'warn',
    aki: 'warn',
    ards: 'safe',
    sic: 'warn',
    shock: 'warn',
  }),
  'PT-21219': buildSimpleSet({
    mortality: 'warn',
    aki: 'safe',
    ards: 'warn',
    sic: 'safe',
    shock: 'warn',
  }),
  'PT-21442': buildSimpleSet({
    mortality: 'safe',
    aki: 'safe',
    ards: 'safe',
    sic: 'safe',
    shock: 'safe',
  }),
  'PT-21508': buildSimpleSet({
    mortality: 'safe',
    aki: 'safe',
    ards: 'safe',
    sic: 'safe',
    shock: 'safe',
  }),
  'PT-21603': buildSimpleSet({
    mortality: 'safe',
    aki: 'safe',
    ards: 'safe',
    sic: 'safe',
    shock: 'safe',
  }),
};

export { emptyPrediction };
