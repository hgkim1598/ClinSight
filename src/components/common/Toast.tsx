import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  /** 자동 사라짐 시각 (ms). 기본 3000. */
  duration?: number;
  /** duration 경과 후 호출. 마운트 해제 콜백 등에 사용. */
  onDismiss?: () => void;
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const LEAVE_DURATION_MS = 200;

export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fadeStartAt = Math.max(0, duration - LEAVE_DURATION_MS);
    const t1 = window.setTimeout(() => setLeaving(true), fadeStartAt);
    const t2 = window.setTimeout(() => onDismiss?.(), duration);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration, onDismiss]);

  const Icon = ICONS[type];

  return (
    <div
      className={`toast toast--${type} ${leaving ? 'is-leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <Icon size={20} className="toast__icon" />
      <span className="toast__message">{message}</span>
    </div>
  );
}

/**
 * 명령형 토스트 헬퍼 — 호출자의 렌더 트리와 독립된 React tree에 마운트한다.
 * 호출자 컴포넌트가 unmount되어도 토스트는 살아남으며, duration 경과 후 자동 정리.
 *
 * 사용 예:
 *   showToast({ message: '저장되었습니다', type: 'success' });
 */
export function showToast(props: Omit<ToastProps, 'onDismiss'>): void {
  const container = document.createElement('div');
  container.className = 'toast-mount';
  document.body.appendChild(container);

  const root = createRoot(container);

  const cleanup = () => {
    // React render 사이클 밖에서 unmount하기 위해 0ms 지연
    window.setTimeout(() => {
      root.unmount();
      container.remove();
    }, 0);
  };

  root.render(<Toast {...props} onDismiss={cleanup} />);
}
