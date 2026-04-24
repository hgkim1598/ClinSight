import type { RiskLevel } from '../../types';
import './Badge.css';

interface BadgeProps {
  level: RiskLevel;
}

const config = {
  high: { label: 'HIGH', className: 'badge-danger' },
  med: { label: 'MED', className: 'badge-warn' },
  low: { label: 'LOW', className: 'badge-safe' },
};

export default function Badge({ level }: BadgeProps) {
  const { label, className } = config[level];

  return <span className={`badge ${className}`}>{label}</span>;
}