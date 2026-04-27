import { Sparkles } from 'lucide-react';
import './AiInsightButton.css';

interface AiInsightButtonProps {
  onClick: () => void;
  label?: string;
}

export default function AiInsightButton({
  onClick,
  label = 'AI 설명 보기',
}: AiInsightButtonProps) {
  return (
    <button
      type="button"
      className="ai-insight-button"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Sparkles size={16} fill="none" stroke="currentColor" aria-hidden="true" />
    </button>
  );
}
