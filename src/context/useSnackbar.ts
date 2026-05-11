import { useContext } from 'react';
import { SnackbarCtx, type SnackbarContextValue } from './snackbarContextObj';

export function useSnackbar(): SnackbarContextValue {
  const v = useContext(SnackbarCtx);
  if (!v) throw new Error('useSnackbar must be used within SnackbarProvider');
  return v;
}
