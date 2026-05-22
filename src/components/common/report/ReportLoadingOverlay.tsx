import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, AlertTriangle } from 'lucide-react';
import './ReportLoadingOverlay.css';

interface ReportLoadingOverlayProps {
  /** 보고서 생성 실패 시 true — 단계 진행 대신 에러 상태 표시. */
  error?: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

const STAGES = [
  '환자 정보 불러오는 중',
  '활력징후 수집 중',
  'AI 예측 결과 분석 중',
  '보고서 생성 중',
] as const;

/** 단계 전환 간격(ms). 마지막 단계는 report 완료까지 계속 진행중으로 둔다. */
const STEP_MS = 800;

type StageState = 'done' | 'active' | 'pending';

function StageRow({ label, state }: { label: string; state: StageState }) {
  return (
    <li className={`report-loading__stage report-loading__stage--${state}`}>
      <span className="report-loading__stage-icon" aria-hidden="true">
        {state === 'done' && <CheckCircle2 size={18} />}
        {state === 'active' && (
          <Loader2 size={18} className="report-loading__spinner" />
        )}
        {state === 'pending' && <Circle size={18} />}
      </span>
      <span className="report-loading__stage-label">{label}</span>
    </li>
  );
}

/**
 * 보고서 생성 중 표시되는 반투명 오버레이.
 * 단계는 시간 기반으로 1→4 순차 진행하며, 마지막 단계는 부모가 언마운트할 때까지(=report 준비될 때까지) 진행중 유지.
 * 실제 API 완료 시점과 정밀 동기화되지 않는 체감용 피드백.
 */
export default function ReportLoadingOverlay({
  error = false,
  onClose,
  onRetry,
}: ReportLoadingOverlayProps) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (error) return;
    // 마지막 단계(STAGES.length - 1)에서 멈추고, 그 단계는 계속 진행중으로 둔다.
    if (activeStage >= STAGES.length - 1) return;
    const t = window.setTimeout(() => setActiveStage((s) => s + 1), STEP_MS);
    return () => window.clearTimeout(t);
  }, [activeStage, error]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="report-loading__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={error ? '보고서 생성 실패' : '보고서 생성 중'}
    >
      <div className="report-loading__card">
        {error ? (
          <div className="report-loading__error">
            <span className="report-loading__error-icon" aria-hidden="true">
              <AlertTriangle size={28} />
            </span>
            <p className="report-loading__error-title">
              보고서를 생성하지 못했습니다
            </p>
            <div className="report-loading__error-actions">
              {onRetry && (
                <button
                  type="button"
                  className="report-loading__btn report-loading__btn--primary"
                  onClick={onRetry}
                >
                  다시 시도
                </button>
              )}
              <button
                type="button"
                className="report-loading__btn report-loading__btn--ghost"
                onClick={onClose}
              >
                닫기
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="report-loading__title">보고서 생성 중</h2>
            <ul className="report-loading__stages">
              {STAGES.map((label, i) => (
                <StageRow
                  key={label}
                  label={label}
                  state={
                    i < activeStage ? 'done' : i === activeStage ? 'active' : 'pending'
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
