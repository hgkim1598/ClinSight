import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * 현재 테마(`dark` | `light`)를 반환하고 `data-theme` 속성 변경에 반응한다.
 * Sidebar의 테마 토글이 `document.documentElement`의 속성을 직접 변경하므로
 * MutationObserver로 그 변경을 감지해 컴포넌트 리렌더를 트리거한다.
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(readTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
