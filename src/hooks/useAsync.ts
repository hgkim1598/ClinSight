import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * 비동기 데이터 fetching 패턴 훅.
 * 서비스 함수가 async/Promise 기반으로 전환되어 컴포넌트에서 반복되는
 * "loading → data | error" 흐름을 단일 hook으로 추상화한다.
 *
 * @param asyncFn 호출할 비동기 함수
 * @param deps    asyncFn 클로저가 의존하는 값들. 값이 바뀌면 자동 refetch.
 *
 * @example
 *   const { data, loading, error, refetch } = useAsync(() => getPatients(), []);
 *   if (loading) return <LoadingState />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: DependencyList = [],
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // asyncFn 최신 closure를 ref에 보관 — execute는 빈 deps로 stable.
  const asyncFnRef = useRef(asyncFn);
  useEffect(() => {
    asyncFnRef.current = asyncFn;
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await asyncFnRef.current();
      setState({ data, loading: false, error: null });
    } catch (e) {
      // TODO: 프로덕션 정리 시 console.error 제거.
      // 화면의 ErrorState 메시지는 하드코딩이라 실제 원인이 안 보이므로
      // 개발 디버깅용으로 콘솔에 stack trace 와 함께 남긴다.
      console.error('[useAsync] 비동기 함수 실패:', e);
      setState({
        data: null,
        loading: false,
        error: e instanceof Error ? e.message : '오류가 발생했습니다',
      });
    }
  }, []);

  useEffect(
    () => {
      // useAsync는 effect에서 데이터를 fetch하고 state를 업데이트하는 패턴.
      // 호출자 deps가 바뀔 때만 재실행되며, asyncFn은 ref로 최신화된다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      execute();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  return { ...state, refetch: execute };
}
