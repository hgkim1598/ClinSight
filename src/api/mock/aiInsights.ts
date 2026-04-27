import type { AiInsightSection, ChatContext, ModelKey } from '../../types';

/**
 * 섹션별 AI 설명 mock 텍스트.
 * - 모델 5개 × 섹션 4개 매트릭스
 * - 톤: "관찰됩니다 / 평가됩니다 / 평가가 필요합니다" (권고/지시 금지)
 * - auxiliary 섹션은 ARDS / Septic Shock 모델만 의미를 가짐 (그 외는 빈 문자열)
 *
 * 향후 Bedrock 응답으로 대체될 자리이며, 컴포넌트는 service 경로만 바라본다.
 */
export const aiInsights: Record<ModelKey, Record<AiInsightSection, string>> = {
  mortality: {
    trend:
      '최근 6시간 동안 사망 위험 확률이 빠르게 상승하는 패턴이 관찰됩니다. 단기 변화 폭이 크므로 관류 상태와 장기부전 지표의 추가 평가가 필요합니다.',
    shap:
      'Lactate 상승과 평균동맥압 저하가 현재 위험도 상승에 가장 크게 기여하는 신호로 평가됩니다. SOFA 점수와 산소화 지표도 누적 기여도가 관찰됩니다.',
    rawMetrics:
      '제시된 모델 입력 지표는 관류 저하 및 호흡부전이 동반된 양상으로 평가됩니다. 측정 시각이 분 단위로 분산되어 있어 동시 추세 해석에 유의가 필요합니다.',
    auxiliary: '',
  },
  aki: {
    trend:
      '소변량 감소와 크레아티닌 상승이 누적되며 AKI 위험 확률이 점진적으로 증가하는 양상이 관찰됩니다. 신기능 회복 여부에 대한 추가 평가가 필요합니다.',
    shap:
      '시간당 소변량과 크레아티닌이 가장 강한 기여 신호로 평가되며, 평균동맥압 저하와 승압제 사용 여부가 보조 신호로 관찰됩니다.',
    rawMetrics:
      '신기능 입력 지표가 동시에 악화 방향으로 정렬된 패턴이 관찰됩니다. 수액 반응성과 약물 영향에 대한 통합 해석이 필요합니다.',
    auxiliary: '',
  },
  ards: {
    trend:
      'PaO2/FiO2 저하와 산소요구량 증가가 동반되며 ARDS 위험 확률이 완만하게 상승하는 양상이 관찰됩니다. 영상 검사 등 추가 평가가 필요합니다.',
    shap:
      '산소화 지표(P/F ratio)와 호흡수 증가가 핵심 기여 신호로 평가됩니다. SpO2와 FiO2 상승 추세도 누적 기여가 관찰됩니다.',
    rawMetrics:
      '산소화·환기 입력 지표가 동시에 악화되는 패턴이 관찰됩니다. 영상 소견과 결합한 임상적 해석이 필요합니다.',
    auxiliary:
      '현재 산소화 추세 기준으로 12시간 내 침습적 기계환기 시작 가능성이 보조지표로 관찰됩니다. onset 이후 신규 시작 대상에 한해 적용되는 보조 신호입니다.',
  },
  sic: {
    trend:
      '혈소판 감소와 PT 연장이 누적되며 SIC 위험 확률이 점진적으로 상승하는 양상이 관찰됩니다. 출혈 소견 동반 여부에 대한 평가가 필요합니다.',
    shap:
      '혈소판 수치와 PT-INR이 가장 강한 기여 신호로 평가됩니다. D-dimer 상승과 SOFA 점수도 보조 신호로 관찰됩니다.',
    rawMetrics:
      '응고 관련 입력 지표가 일관되게 악화 방향으로 분포된 패턴이 관찰됩니다. 추가 응고검사와 임상 출혈 소견 평가가 필요합니다.',
    auxiliary: '',
  },
  shock: {
    trend:
      '수액 소생 이후에도 평균동맥압이 회복되지 않고 lactate 상승이 지속되는 양상이 관찰됩니다. 승압제 요구 가능성에 대한 평가가 필요합니다.',
    shap:
      '평균동맥압과 lactate가 핵심 기여 신호로 평가됩니다. 심박수와 누적 수액 균형도 추가 기여가 관찰됩니다.',
    rawMetrics:
      '관류 관련 입력 지표가 저관류 패턴으로 정렬되어 있는 양상이 관찰됩니다. 수액 반응성에 대한 통합 해석이 필요합니다.',
    auxiliary:
      '현재 혈역학 추세 기준으로 12시간 내 승압제 사용 가능성이 보조지표로 관찰됩니다. 이미 승압제를 사용 중인 환자는 본 신호의 적용 대상이 아닙니다.',
  },
};

// ============================================
// 채팅 모드 mock
// - 인트로: 패널 진입 시 AI가 먼저 보내는 메시지
// - 응답: 사용자 입력에 대한 답변 풀 (랜덤 선택)
// - 톤은 동일하게 "관찰됩니다 / 평가가 필요합니다" 유지
// ============================================

const SECTION_LABEL: Record<AiInsightSection, string> = {
  trend: '확률 추이',
  shap: 'SHAP 피처 기여도',
  rawMetrics: 'Raw 임상 지표',
  auxiliary: '보조지표 (치료 에스컬레이션)',
};

export function buildSectionChatIntro(
  modelKey: ModelKey,
  section: AiInsightSection,
): string {
  const summary = aiInsights[modelKey]?.[section] ?? '';
  const label = SECTION_LABEL[section];
  if (!summary) {
    return `${label}에 대해 질문해주세요. 현재 환자 데이터를 기반으로 답변드립니다.`;
  }
  return `${label}에 대해 안내드립니다. ${summary} 추가로 궁금한 부분이 있으면 질문해주세요.`;
}

const SECTION_CHAT_RESPONSES: Record<AiInsightSection, string[]> = {
  trend: [
    '최근 6시간 추이를 보면 단기 변화 폭이 비교적 큰 편으로 평가됩니다. 이전 24시간 데이터와 비교한 평가가 추가로 필요합니다.',
    '현재 추세선의 기울기는 점진적 상승 패턴으로 관찰됩니다. 같은 시간대 다른 모델 추이와 함께 해석하시는 편이 도움이 됩니다.',
    '추세 데이터만으로는 인과관계를 단정하기 어렵습니다. 동일 구간의 raw 지표와 SHAP 기여도를 함께 확인하시는 것이 적절합니다.',
  ],
  shap: [
    '상위 기여 신호 두 가지가 동일한 임상 축(관류/산소화)에 정렬되어 있는 점이 관찰됩니다. 단일 지표 변동이 다른 신호로 연쇄될 가능성에 대한 평가가 필요합니다.',
    '하위 기여 항목은 절대값이 작아 단독 해석은 권장되지 않습니다. 상위 3개 신호와 raw 측정치를 우선적으로 확인하시는 편이 적절합니다.',
    'SHAP 값은 모델 내부 기여도이며, 임상 확률 변화량(%p)과는 직접 비례하지 않는 점을 참고해주세요.',
  ],
  rawMetrics: [
    '제시된 모델 입력 지표는 측정 시각이 분 단위로 분산되어 있어 동시 추세 해석에 유의가 필요합니다.',
    '입력 지표 간 상관성이 높을 경우 SHAP 기여도가 분산되어 표시될 수 있습니다. 통합 해석에 대한 평가가 필요합니다.',
    '"Display only"로 표기된 항목은 모델 입력에 사용되지 않은 참고용 측정치입니다. 임상 의사결정에는 사용 가능하지만 모델 확률에는 직접 반영되지 않습니다.',
  ],
  auxiliary: [
    '보조지표는 onset 이후 새로운 치료 시작 가능성을 평가하는 신호입니다. 이미 해당 치료 중인 경우 본 신호의 적용 대상이 아닙니다.',
    '12시간 윈도우는 임상 에스컬레이션 의사결정 시점을 기준으로 설정된 값으로 관찰됩니다. 환자의 현재 안정성과 함께 평가가 필요합니다.',
    '보조지표가 높게 관찰되더라도 단독으로는 치료 시작 근거가 되지 않습니다. 본 모델 확률 및 raw 지표와 함께 해석하시는 편이 적절합니다.',
  ],
};

export function buildPatientChatIntro(patientId: string): string {
  return `안녕하세요. ${patientId} 환자의 현재 상태에 대해 질문해주세요. 모델 예측, 추세, 임상 지표 어느 항목이든 답변드립니다.`;
}

const PATIENT_CHAT_RESPONSES: string[] = [
  '현재 환자는 다수의 모델에서 위험 신호가 동시에 관찰되는 패턴으로 평가됩니다. 관류 회복 여부와 장기부전 지표 추적이 필요합니다.',
  '최근 6시간 사이 주요 지표가 악화 방향으로 정렬되어 있는 양상이 관찰됩니다. 인계 시 추세와 보조지표를 함께 전달하시는 편이 적절합니다.',
  '환자의 baseline과 현재 상태 비교가 추가로 필요합니다. 입실 당시 수치와 함께 해석하시면 변화 폭을 보다 정확히 평가할 수 있습니다.',
  '구체적인 지표나 모델명을 알려주시면 해당 부분에 대해 더 자세히 안내드립니다.',
];

export function getChatResponseFromMock(context: ChatContext): string {
  if (context.type === 'patient') {
    return pickRandom(PATIENT_CHAT_RESPONSES);
  }
  return pickRandom(SECTION_CHAT_RESPONSES[context.section]);
}

function pickRandom<T>(pool: T[]): T {
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
