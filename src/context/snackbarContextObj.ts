import { createContext } from 'react';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarOptions {
  message: string;
  type?: SnackbarType;
  /**
   * 지정 시 ms 경과 후 자동으로 닫힘 + "확인" 버튼은 숨김 (X 버튼은 유지).
   * 미지정이면 사용자가 닫을 때까지 유지 (기본 동작).
   */
  autoHideMs?: number;
}

export interface SnackbarContextValue {
  show: (options: SnackbarOptions) => void;
  dismiss: () => void;
}

export const SnackbarCtx = createContext<SnackbarContextValue | null>(null);
