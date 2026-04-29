import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = '데이터를 불러오는 중...',
}: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span className="loading-state__text">{message}</span>
    </div>
  );
}
