import { useNavigate } from 'react-router-dom';
import type { Alert, AlertAction, AlertSource } from '../../types';
import './AlertCard.css';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (id: string) => void;
}

const SOURCE_TAG: Record<AlertSource, { label: string; modifier: string }> = {
  deep_model: { label: 'AI 예측', modifier: 'alert-card__source--deep' },
  light_model: { label: 'AI 스크리닝', modifier: 'alert-card__source--light' },
  threshold: { label: '임계치 초과', modifier: 'alert-card__source--threshold' },
};

export default function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const navigate = useNavigate();
  const sourceTag = SOURCE_TAG[alert.source];

  const visibleActions = alert.actions.filter((a) => {
    if (a.type === 'acknowledge') return alert.status === 'new';
    return true;
  });

  const goToPatient = () => navigate(`/patient/${alert.patient.id}`);

  const handleCardClick = () => {
    goToPatient();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToPatient();
    }
  };

  const handleAction = (action: AlertAction) => {
    if (action.type === 'acknowledge') {
      onAcknowledge(alert.id);
    } else if (action.type === 'view_patient') {
      goToPatient();
    } else if (action.type === 'escalate') {
      window.alert('상급 보고 기능은 준비 중입니다');
    }
  };

  return (
    <article
      className={`alert-card alert-card--${alert.priority} alert-card--${alert.status}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${alert.patient.name} ${alert.title}`}
    >
      <div className="alert-card__row alert-card__row--meta">
        <div className="alert-card__source-group">
          <span className={`alert-card__source ${sourceTag.modifier}`}>
            {sourceTag.label}
          </span>
          {alert.confidence != null && (
            <span className="alert-card__confidence">
              신뢰도 {alert.confidence}%
            </span>
          )}
        </div>
        <span className="alert-card__patient-meta">
          {alert.timestamp} · {alert.patient.name} · {alert.patient.bed}
        </span>
      </div>

      <h3 className="alert-card__title">{alert.title}</h3>

      <p className="alert-card__body">{alert.body}</p>

      {alert.tags.length > 0 && (
        <div className="alert-card__tags">
          {alert.tags.map((tag) => (
            <span key={tag} className="alert-card__tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {alert.status === 'acknowledged' && alert.acknowledgedBy && (
        <div className="alert-card__status-meta">
          {alert.acknowledgedBy} 확인 · {alert.acknowledgedAt}
        </div>
      )}
      {alert.status === 'resolved' && alert.resolvedAt && (
        <div className="alert-card__status-meta">해소 · {alert.resolvedAt}</div>
      )}

      {visibleActions.length > 0 && (
        <div className="alert-card__actions">
          {visibleActions.map((action) => {
            const isPrimary = action.type === 'acknowledge';
            return (
              <button
                key={action.type}
                type="button"
                className={`alert-card__action ${isPrimary ? 'is-primary' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(action);
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
