import { createContext } from 'react';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarOptions {
  message: string;
  type?: SnackbarType;
  /** 자동 dismiss 까지의 시간(ms). 기본 4000. `Infinity` 면 영구 표시(수동 dismiss 필요). */
  duration?: number;
}

export interface SnackbarContextValue {
  show: (options: SnackbarOptions) => void;
  dismiss: () => void;
}

export const SnackbarCtx = createContext<SnackbarContextValue | null>(null);
