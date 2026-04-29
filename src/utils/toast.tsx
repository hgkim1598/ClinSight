import { createRoot } from 'react-dom/client';
import Toast from '../components/common/Toast';

interface ShowToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  /** 자동 사라짐 시각 (ms). 기본 3000. */
  duration?: number;
}

/**
 * 명령형 토스트 헬퍼 — 호출자의 렌더 트리와 독립된 React tree에 마운트한다.
 * 호출자 컴포넌트가 unmount되어도 토스트는 살아남으며, duration 경과 후 자동 정리.
 *
 * 사용 예:
 *   showToast({ message: '저장되었습니다', type: 'success' });
 */
export function showToast(props: ShowToastOptions): void {
  const container = document.createElement('div');
  container.className = 'toast-mount';
  document.body.appendChild(container);

  const root = createRoot(container);

  const cleanup = () => {
    // React render 사이클 밖에서 unmount하기 위해 0ms 지연
    window.setTimeout(() => {
      root.unmount();
      container.remove();
    }, 0);
  };

  root.render(<Toast {...props} onDismiss={cleanup} />);
}
