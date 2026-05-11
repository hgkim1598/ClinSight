import { useContext } from 'react';
import type { Me } from '../types';
import { MetaCtx, type MetaContextValue } from './metaContextObj';

export function useMeta(): MetaContextValue {
  const v = useContext(MetaCtx);
  if (!v) throw new Error('useMeta must be used within MetaProvider');
  return v;
}

export function useMe(): Me | null {
  return useMeta().me;
}
