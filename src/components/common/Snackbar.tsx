import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import type { SnackbarType } from '../../context/snackbarContextObj';
import './Snackbar.css';

interface SnackbarProps {
  message: string;
  type: SnackbarType;
  /**
   * 지정 시 ms 경과 후 자동 dismiss + "확인" 버튼 숨김 (X 버튼만 노출).
   * 미지정이면 사용자가 닫을 때까지 유지.
   */
  autoHideMs?: number;
  onDismiss: () => void;
}

const ICONS: Record<SnackbarType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

/**
 * 화면 하단 중앙에 표시되는 Snackbar.
 * - 기본: 영구 표시. 사용자가 "확인" 또는 X 버튼으로 직접 닫음.
 * - autoHideMs 지정 시: 해당 ms 후 자동 dismiss. 확인 버튼은 숨기고 X만 노출.
 * SnackbarProvider가 단일 인스턴스를 렌더링한다.
 */
export default function Snackbar({
  message,
  type,
  autoHideMs,
  onDismiss,
}: SnackbarProps) {
  const Icon = ICONS[type];
  const autoHide = autoHideMs != null && autoHideMs > 0;

  // autoHide가 켜진 경우만 타이머 설정. message 변경 시 key 리마운트되므로 useEffect도 재실행.
  useEffect(() => {
    if (!autoHide) return;
    const timer = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [autoHide, autoHideMs, onDismiss]);

  return (
    <div
      className={`snackbar snackbar--${type}`}
      role="status"
      aria-live="polite"
    >
      <Icon size={18} className="snackbar__icon" aria-hidden="true" />
      <span className="snackbar__message">{message}</span>
      {/* 자동 닫힘 모드에서는 명시적 확인 버튼이 필요 없음 — 사용자 흐름을 막지 않도록 숨김 */}
      {!autoHide && (
        <button
          type="button"
          className="snackbar__confirm"
          onClick={onDismiss}
        >
          확인
        </button>
      )}
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
