import type { RiskLevel, RiskTone } from '../types';

/** ICU 식별자 — MVP 단계 단일 ICU. 추후 라우팅/설정에서 주입. */
export const CURRENT_ICU_ID = 'ICU_A';

/** 위험도 임계치 (CLAUDE.md §위험도 기준). risk_score는 0~1. */
export const RISK_THRESHOLDS = {
  HIGH: 0.6,
  MEDIUM: 0.3,
} as const;

/** 위험도 라벨 (UI 표시용) */
export const RISK_LABELS: Record<RiskLevel, string> = {
  critical: '위험',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

/** RiskLevel → UI 색상 톤 매핑. */
export function riskLabelToTone(risk: RiskLevel): RiskTone {
  if (risk === 'critical' || risk === 'high') return 'danger';
  if (risk === 'medium') return 'warn';
  return 'safe';
}

/** UI 톤 → RiskLevel 역매핑 (mock 호환용). */
export function toneToRisk(tone: RiskTone): RiskLevel {
  if (tone === 'danger') return 'high';
  if (tone === 'warn') return 'medium';
  return 'low';
}

/** risk_score(0~1)에서 RiskLevel 파생 — 임계치 기반. */
export function scoreToRiskLabel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.HIGH) return 'high';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

/**
 * sepsis_deep_prob 전용 임계치 — 패혈증 위험 분류만 별도 기준 적용.
 * (mortality/aki 등 다른 모델 score 는 RISK_THRESHOLDS 사용)
 */
export const SEPSIS_RISK_THRESHOLDS = {
  HIGH: 0.3,
  MEDIUM: 0.2,
} as const;

/** sepsis_deep_prob(0~1) → RiskLevel. SEPSIS_RISK_THRESHOLDS 기반. */
export function sepsisProbToRiskLabel(score: number): RiskLevel {
  if (score >= SEPSIS_RISK_THRESHOLDS.HIGH) return 'high';
  if (score >= SEPSIS_RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}
