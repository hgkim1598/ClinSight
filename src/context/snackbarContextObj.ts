import { createContext } from 'react';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarOptions {
  message: string;
  type?: SnackbarType;
}

export interface SnackbarContextValue {
  show: (options: SnackbarOptions) => void;
  dismiss: () => void;
}

export const SnackbarCtx = createContext<SnackbarContextValue | null>(null);
