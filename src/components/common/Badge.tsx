import type { RiskLevel } from '../../types';
import './Badge.css';

interface BadgeProps {
  /** 위험도. null/undefined 또는 알 수 없는 값이면 회색 N/A 뱃지로 표시. */
  level: RiskLevel | string | null | undefined;
}

const config: Record<string, { label: string; className: string }> = {
  high: { label: 'HIGH', className: 'badge-danger' },
  medium: { label: 'MED', className: 'badge-warn' },
  low: { label: 'LOW', className: 'badge-safe' },
};

const unknownConfig = { label: 'N/A', className: 'badge-unknown' };

export default function Badge({ level }: BadgeProps) {
  const entry = (level ? config[level] : undefined) ?? unknownConfig;
  return <span className={`badge ${entry.className}`}>{entry.label}</span>;
}