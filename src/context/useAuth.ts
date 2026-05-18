import { useContext } from 'react';
import { AuthCtx, type AuthContextValue } from './authContextObj';

export function useAuth(): AuthContextValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
