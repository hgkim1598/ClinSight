import type { RiskLevel, RiskTone } from '../types';

/** 현재 사용자 표시명 — Cognito 연동 전 placeholder. /me 연결 시 useMe()로 교체. */
export const CURRENT_USER = '담당 의료진';

/** ICU 식별자 — MVP 단계 단일 ICU. 추후 라우팅/설정에서 주입. */
export const CURRENT_ICU_ID = 'ICU_A';

/** 위험도 임계치 (CLAUDE.md §위험도 기준). risk_score는 0~1. */
export const RISK_THRESHOLDS = {
  HIGH: 0.6,
  MEDIUM: 0.3,
} as const;

/** 위험도 라벨 (UI 표시용) */
export const RISK_LABELS: Record<RiskLevel, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

/** RiskLevel → UI 색상 톤 매핑. */
export function riskLabelToTone(risk: RiskLevel): RiskTone {
  if (risk === 'high') return 'danger';
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
