import type { OrganKey } from '../../../types';
import { ORGANS, ORGAN_ICON, scoreToToneClass } from './sofaConfig';

interface SofaBodySvgProps {
  silhouetteSrc: string;
  selected: OrganKey | null;
  latestScores: Record<OrganKey, number | null>;
  onOrganClick: (key: OrganKey) => void;
}

export default function SofaBodySvg({
  silhouetteSrc,
  selected,
  latestScores,
  onOrganClick,
}: SofaBodySvgProps) {
  return (
    <div className="sofa-body">
      <svg
        className="sofa-body__leaders"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {ORGANS.map((o) => (
          <line
            key={o.key}
            x1={o.anchor.x}
            y1={o.anchor.y}
            x2={o.target.x}
            y2={o.target.y}
            stroke="var(--anatomy-line)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        ))}
      </svg>

      <img
        src={silhouetteSrc}
        alt=""
        aria-hidden="true"
        className="sofa-body__silhouette"
      />

      {ORGANS.map((o) => {
        const score = latestScores[o.key];
        const tone = score == null ? 'muted' : scoreToToneClass(score);
        const isSelected = selected === o.key;
        const scoreLabel = score == null ? '측정 데이터 없음' : `${score}점`;
        const Icon = ORGAN_ICON[o.key];
        return (
          <button
            key={o.key}
            type="button"
            className={`sofa-organ sofa-organ--${o.key} ${
              isSelected ? 'is-selected' : ''
            }`}
            style={o.buttonPos}
            onClick={() => onOrganClick(o.key)}
            aria-pressed={isSelected}
            aria-label={`${o.label} ${scoreLabel}${isSelected ? ' (선택됨)' : ''}`}
          >
            <span className="sofa-organ__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="sofa-organ__meta">
              <span className="sofa-organ__label">{o.label}</span>
              <span className={`sofa-organ__score sofa-organ__score--${tone}`}>
                {score == null ? '—' : score}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
