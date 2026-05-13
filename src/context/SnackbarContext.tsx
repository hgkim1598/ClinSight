/**
 * SnackbarProvider — 앱 전역에 1개의 Snackbar를 렌더한다.
 *
 * - 사용자가 닫을 때까지 자동 사라지지 않음.
 * - 한 번에 1개 메시지. 새 메시지가 오면 기존을 즉시 교체.
 * - 사용: `const { show } = useSnackbar(); show({ message, type })`.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import Snackbar from '../components/common/Snackbar';
import {
  SnackbarCtx,
  type SnackbarContextValue,
  type SnackbarOptions,
  type SnackbarType,
} from './snackbarContextObj';

interface SnackbarState {
  id: number;
  message: string;
  type: SnackbarType;
  autoHideMs?: number;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SnackbarState | null>(null);

  const show = useCallback((options: SnackbarOptions) => {
    setCurrent({
      id: Date.now(),
      message: options.message,
      type: options.type ?? 'info',
      autoHideMs: options.autoHideMs,
    });
  }, []);

  const dismiss = useCallback(() => {
    setCurrent(null);
  }, []);

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
          autoHideMs={current.autoHideMs}
          onDismiss={dismiss}
        />
      )}
    </SnackbarCtx.Provider>
  );
}
