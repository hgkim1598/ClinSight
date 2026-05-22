import { useNavigate } from 'react-router-dom';
import type { Alert, AlertAction, DashboardPatient } from '../../types';
import { markAlertRead } from '../../api/services/alertService';
import { useSnackbar } from '../../context/useSnackbar';
import { patientLocalData } from '../../data/patientLocalData';
import { formatTime } from '../../utils/time';
import './AlertCard.css';

interface AlertCardProps {
  alert: Alert;
  /** AlertsPage 캐시에서 stay_id 로 매칭된 환자 (이름/병실 표시용). 없으면 8자리 폴백. */
  patient?: DashboardPatient;
  onAcknowledge: (id: string) => Promise<void> | void;
  onResolve: (id: string) => Promise<void> | void;
  /** 카드 클릭 시 read 처리 후 호출. 보통 목록 refetch. */
  onRead?: (id: string) => Promise<void> | void;
}

/**
 * alert_source → 화면 표시 배지.
 *
 * API의 alert_source는 model_key('mortality_48h' 등) 또는 trigger_rule_key('threshold' 등)가
 * 들어온다. 컴포넌트가 카테고리로 분류해 표시한다.
 */
function getSourceTag(alertSource: string): { label: string; modifier: string } {
  if (alertSource === 'threshold') {
    return { label: '임계치 초과', modifier: 'alert-card__source--threshold' };
  }
  if (alertSource.includes('light') || alertSource.includes('screen')) {
    return { label: 'AI 스크리닝', modifier: 'alert-card__source--light' };
  }
  return { label: 'AI 예측', modifier: 'alert-card__source--deep' };
}

/**
 * severity/status에서 어떤 액션을 노출할지 결정.
 * (1차 결정: API actions 미포함, 프론트에서 결정)
 */
function buildActions(alert: Alert): AlertAction[] {
  const actions: AlertAction[] = [];
  if (alert.status === 'active') {
    actions.push({ type: 'acknowledge', label: '확인' });
    if (alert.severity === 'critical') {
      actions.push({ type: 'escalate', label: '상급 보고' });
    }
  }
  if (alert.status === 'acknowledged') {
    actions.push({ type: 'resolve', label: '해소' });
  }
  actions.push({ type: 'view_patient', label: '환자 보기' });
  return actions;
}

export default function AlertCard({
  alert,
  patient,
  onAcknowledge,
  onResolve,
  onRead,
}: AlertCardProps) {
  const navigate = useNavigate();
  const { show } = useSnackbar();
  const sourceTag = getSourceTag(alert.alertSource);
  const actions = buildActions(alert);

  const goToPatient = async () => {
    if (alert.delivery.readAt == null) {
      try {
        await markAlertRead(alert.alertId);
        onRead?.(alert.alertId);
      } catch {
        // 읽음 처리 실패는 사용자 흐름을 막지 않는다.
      }
    }
    navigate(`/patient/${alert.stayToken}`);
  };

  const handleCardClick = () => {
    void goToPatient();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void goToPatient();
    }
  };

  const handleAcknowledge = async () => {
    try {
      await onAcknowledge(alert.alertId);
      show({ message: '알림이 확인 처리되었습니다.', type: 'success' });
    } catch {
      show({ message: '알림 확인 처리에 실패했습니다.', type: 'error' });
    }
  };

  const handleResolve = async () => {
    try {
      await onResolve(alert.alertId);
      show({ message: '알림이 해소 처리되었습니다.', type: 'success' });
    } catch {
      show({ message: '알림 해소 처리에 실패했습니다.', type: 'error' });
    }
  };

  const handleAction = (action: AlertAction) => {
    if (action.type === 'acknowledge') {
      void handleAcknowledge();
    } else if (action.type === 'view_patient') {
      void goToPatient();
    } else if (action.type === 'escalate') {
      show({ message: '상급 보고 기능은 준비 중입니다.', type: 'info' });
    } else if (action.type === 'resolve') {
      void handleResolve();
    }
  };

  const statusClass =
    alert.status === 'active'
      ? 'alert-card--new'
      : `alert-card--${alert.status}`;
  const priorityClass =
    alert.severity === 'critical'
      ? 'alert-card--critical'
      : 'alert-card--warning';

  // 캐시에 매칭된 환자가 있으면 이름(+병실), 없으면 stay_id 앞 8자리만 (UUID 전체 노출 방지).
  const localName = patient ? patientLocalData[patient.patientToken]?.name : undefined;
  const shortId = alert.stayToken ? `${alert.stayToken.slice(0, 8)}…` : '';
  const displayName = localName ?? shortId;
  const bedLabel = localName ? patient?.currentBedLabel : undefined;
  const timeLabel = formatTime(alert.createdAt);

  return (
    <article
      className={`alert-card ${priorityClass} ${statusClass}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${displayName} ${alert.title}`}
    >
      <div className="alert-card__row alert-card__row--meta">
        <div className="alert-card__source-group">
          <span className={`alert-card__source ${sourceTag.modifier}`}>
            {sourceTag.label}
          </span>
          {alert.confidence != null && (
            <span className="alert-card__confidence">
              신뢰도 {Math.round(alert.confidence * 100)}%
            </span>
          )}
        </div>
        <span className="alert-card__patient-meta">
          {timeLabel} · {displayName}
          {bedLabel ? ` · ${bedLabel}` : ''}
        </span>
      </div>

      <h3 className="alert-card__title">{alert.title}</h3>

      <p className="alert-card__body">{alert.message}</p>

      {alert.tags.length > 0 && (
        <div className="alert-card__tags">
          {alert.tags.map((tag) => (
            <span key={tag} className="alert-card__tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {alert.status === 'acknowledged' && alert.delivery.acknowledgedAt && (
        <div className="alert-card__status-meta">
          확인 · {formatTime(alert.delivery.acknowledgedAt)}
        </div>
      )}
      {alert.status === 'resolved' && (
        <div className="alert-card__status-meta">해소됨</div>
      )}

      {actions.length > 0 && (
        <div className="alert-card__actions">
          {actions.map((action) => {
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
