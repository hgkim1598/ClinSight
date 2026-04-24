import type { ReactNode } from 'react';
import type { KpiData } from '../../types';
import './KpiCard.css';

interface KpiCardProps {
  data: KpiData;
  icon?: ReactNode;
}

export default function KpiCard({ data, icon }: KpiCardProps) {
  const tone = data.tone ?? 'default';

  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__head">
        <span className="kpi-card__label">{data.label}</span>
        {icon && <span className="kpi-card__icon">{icon}</span>}
      </div>
      <div className="kpi-card__value">{data.value}</div>
      <div className="kpi-card__sub">{data.sub}</div>
    </div>
  );
}
