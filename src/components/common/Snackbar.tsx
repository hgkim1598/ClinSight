import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import type { SnackbarType } from '../../context/snackbarContextObj';
import './Snackbar.css';

interface SnackbarProps {
  message: string;
  type: SnackbarType;
  onDismiss: () => void;
}

const ICONS: Record<SnackbarType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

/**
 * 화면 하단 중앙에 표시되는 영구 Snackbar (사용자가 닫을 때까지 유지).
 * SnackbarProvider가 단일 인스턴스를 렌더링한다.
 */
export default function Snackbar({ message, type, onDismiss }: SnackbarProps) {
  const Icon = ICONS[type];
  return (
    <div
      className={`snackbar snackbar--${type}`}
      role="status"
      aria-live="polite"
    >
      <Icon size={18} className="snackbar__icon" aria-hidden="true" />
      <span className="snackbar__message">{message}</span>
      <button
        type="button"
        className="snackbar__confirm"
        onClick={onDismiss}
      >
        확인
      </button>
      <button
        type="button"
        className="snackbar__close"
        onClick={onDismiss}
        aria-label="알림 닫기"
      >
        <X size={16} />
      </button>
    </div>
  );
}
