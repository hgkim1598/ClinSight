import { useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Info, Sparkles, X } from 'lucide-react';
import './AiInsightModal.css';

interface AiInsightModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  insight: string;
}

export default function AiInsightModal({
  open,
  onClose,
  title,
  children,
  insight,
}: AiInsightModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="ai-modal__overlay" onClick={handleOverlayClick}>
      <div
        className="ai-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
      >
        <header className="ai-modal__header">
          <h3 id="ai-modal-title" className="ai-modal__title">
            <Sparkles size={16} className="ai-modal__title-icon" aria-hidden="true" />
            {title}
          </h3>
          <button
            ref={closeBtnRef}
            type="button"
            className="ai-modal__close"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        <div className="ai-modal__body">{children}</div>

        <section className="ai-modal__insight" aria-label="AI 설명">
          <h4 className="ai-modal__insight-title">AI 설명</h4>
          <p className="ai-modal__insight-text">{insight}</p>
          <div className="ai-modal__disclaimer">
            <Info size={12} aria-hidden="true" />
            AI 생성 텍스트 · 임상 판단 대체 불가
          </div>
        </section>
      </div>
    </div>
  );
}
