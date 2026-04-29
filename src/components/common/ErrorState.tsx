import './ErrorState.css';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = '데이터를 불러오지 못했습니다',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state__text">{message}</span>
      {onRetry && (
        <button type="button" className="error-state__retry" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}
