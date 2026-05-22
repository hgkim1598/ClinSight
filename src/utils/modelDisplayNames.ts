/**
 * 모델 표시명 — model_key 기반 매핑.
 *
 * - 백엔드 `model_name` 필드는 아키텍처 정보(BiLSTM+XGBoost 등)를 포함해
 *   의료진 UI에 노출하기 부적합. 본 매핑이 단일 진입점에서 표시명을 결정한다.
 * - 매핑 없는 model_key는 `cleanModelName()`이 trailing `(...)` 괄호를 제거해 폴백.
 */

export const MODEL_KEY_DISPLAY_NAME: Record<string, string> = {
  mortality_48h: '48h 사망 위험도',
  aki_24h: '24h 급성신손상 위험도',
  ards_72h: '72h ARDS 위험도',
  sic_48h: '48h 패혈증 유발 응고병증',
  septic_shock_48h: '48h 패혈성 쇼크',
  sepsis_deep: '패혈증 심층 예측',
  sepsis_light: '패혈증 경량 예측',
  mech_vent: '인공호흡기 필요도',
  oxygen: '산소 요법 필요도',
  vasopressor: '승압제 필요도',
};

/** 백엔드 모델명에서 trailing `(...)` 괄호 (아키텍처 표기) 제거. */
export function cleanModelName(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/\s*\([^)]*\)\s*$/g, '').trim();
}

/**
 * model_key 기반 표시명. 매핑이 있으면 매핑값, 없으면 backendName에서 괄호 제거한 값,
 * 둘 다 없으면 model_key 그대로.
 */
export function displayNameFor(modelKey: string, backendName?: string | null): string {
  return MODEL_KEY_DISPLAY_NAME[modelKey] ?? cleanModelName(backendName) ?? modelKey;
}
