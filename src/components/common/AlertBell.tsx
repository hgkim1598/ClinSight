import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNewAlertCount } from '../../api/services/alertService';
import './AlertBell.css';

export default function AlertBell() {
  const navigate = useNavigate();
  const count = getNewAlertCount();
  const hasNew = count > 0;

  return (
    <button
      type="button"
      className="alert-bell"
      onClick={() => navigate('/alerts')}
      aria-label={hasNew ? `알림 ${count}건` : '알림'}
      title="알림"
    >
      <Bell size={20} className="alert-bell__icon" />
      {hasNew && (
        <span className="alert-bell__badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
