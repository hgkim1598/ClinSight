import type { RiskLevel, RiskTone } from '../types';

/** 현재 사용자 표시명 — Cognito 연동 전 placeholder */
export const CURRENT_USER = '담당 의료진';

/** 위험도 임계치 (CLAUDE.md §위험도 기준) */
export const RISK_THRESHOLDS = {
  HIGH: 60,
  MED: 30,
} as const;

/** 위험도 라벨 (UI 표시용) */
export const RISK_LABELS: Record<RiskLevel, string> = {
  high: 'HIGH',
  med: 'MED',
  low: 'LOW',
};

/**
 * 모델 결과의 tone(danger/warn/safe)을 위험도 등급(high/med/low)으로 변환.
 * 여러 컴포넌트에서 동일 로직이 중복되어 있어 단일 source로 통합.
 */
export function toneToRisk(tone: RiskTone): RiskLevel {
  if (tone === 'danger') return 'high';
  if (tone === 'warn') return 'med';
  return 'low';
}
