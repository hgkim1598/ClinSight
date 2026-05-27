/**
 * SnackbarProvider — 앱 전역에 1개의 Snackbar를 렌더한다.
 *
 * - 기본 4초 후 자동 dismiss. 수동 dismiss(확인/X 버튼) 도 그대로 동작.
 * - 한 번에 1개 메시지. 새 메시지가 오면 기존을 즉시 교체.
 * - 사용: `const { show } = useSnackbar(); show({ message, type, duration? })`.
 *   `duration: Infinity` 로 호출하면 수동으로 닫을 때까지 표시 유지.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Snackbar from '../components/common/Snackbar';
import {
  SnackbarCtx,
  type SnackbarContextValue,
  type SnackbarOptions,
  type SnackbarType,
} from './snackbarContextObj';

const DEFAULT_DURATION_MS = 4000;

interface SnackbarState {
  id: number;
  message: string;
  type: SnackbarType;
  duration: number;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SnackbarState | null>(null);

  const show = useCallback((options: SnackbarOptions) => {
    setCurrent({
      id: Date.now(),
      message: options.message,
      type: options.type ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION_MS,
    });
  }, []);

  const dismiss = useCallback(() => {
    setCurrent(null);
  }, []);

  // TODO: 각 Snackbar 호출부별로 영구 표시(확인 필수) vs 자동 사라짐 재판단 필요
  // 현재는 일괄 4초 자동 dismiss 적용. 필요시 duration: Infinity로 영구 표시 전환 가능
  useEffect(() => {
    if (!current) return;
    const ms = current.duration ?? DEFAULT_DURATION_MS;
    // Infinity 면 자동 dismiss 비활성 (setTimeout 에 Infinity 전달 시 즉시 발화 위험).
    if (!Number.isFinite(ms)) return;
    const t = setTimeout(dismiss, ms);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  const value = useMemo<SnackbarContextValue>(
    () => ({ show, dismiss }),
    [show, dismiss],
  );

  return (
    <SnackbarCtx.Provider value={value}>
      {children}
      {current && (
        <Snackbar
          key={current.id}
          message={current.message}
          type={current.type}
          onDismiss={dismiss}
        />
      )}
    </SnackbarCtx.Provider>
  );
}
