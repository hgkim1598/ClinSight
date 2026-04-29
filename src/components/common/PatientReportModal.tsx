import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Printer, X } from 'lucide-react';
import type { PatientReport } from '../../types';
import { CURRENT_USER } from '../../utils/constants';
import ConsultRequestModal from './ConsultRequestModal';
import ReportContent from './report/ReportContent';
import ConsultationNotes from './report/ConsultationNotes';
import './PatientReportModal.css';

interface PatientReportModalProps {
  open: boolean;
  onClose: () => void;
  report: PatientReport;
  /** true이면 하단 협진 요청 버튼 영역을 렌더링하지 않음 (이미 요청된 건 열람 시 사용) */
  hideConsultButton?: boolean;
}

function formatDateTime(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

export default function PatientReportModal({
  open,
  onClose,
  report,
  hideConsultButton = false,
}: PatientReportModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [consultOpen, setConsultOpen] = useState(false);

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

  // 모달이 닫히면 자식(협진) 모달 상태도 초기화 — render 중 prop 변화에 동기화
  if (!open && consultOpen) {
    setConsultOpen(false);
  }

  if (!open) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const { patient, generatedAt } = report;
  const generatedAtText = formatDateTime(generatedAt);

  return (
    <div className="report-modal__overlay" onClick={handleOverlayClick}>
      <div
        className="report-modal__toolbar"
        role="toolbar"
        aria-label="보고서 도구"
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="report-modal__toolbar-close"
          onClick={onClose}
          aria-label="보고서 닫기"
        >
          <X size={18} />
          <span>닫기</span>
        </button>
        <div className="report-modal__toolbar-right">
          <span className="report-modal__pdf-hint">
            인쇄 &gt; PDF로 저장으로 PDF 생성 가능
          </span>
          <button
            type="button"
            className="report-modal__toolbar-print"
            onClick={handlePrint}
          >
            <Printer size={16} />
            인쇄
          </button>
        </div>
      </div>

      <article
        className="report-modal__paper"
        role="document"
        aria-label="환자 상태 요약 보고서"
      >
        <header className="report-paper__header">
          <span className="report-paper__brand">ClinSight</span>
          <h2 className="report-paper__title">환자 상태 요약 보고서</h2>
          <span className="report-paper__time">생성 {generatedAtText}</span>
        </header>

        <ReportContent report={report} />

        <ConsultationNotes />

        <footer className="report-paper__footer">
          <p>본 보고서는 ClinSight CDSS에 의해 자동 생성되었습니다.</p>
          <p>
            생성자: {CURRENT_USER} | 생성일시: {generatedAtText}
          </p>
          <p>
            AI 예측 결과는 참고 자료이며, 최종 임상 판단은 담당 의료진에게
            있습니다.
          </p>
        </footer>
      </article>

      {!hideConsultButton && (
        <div className="report-modal__actions">
          <button
            type="button"
            className="report-modal__consult-btn"
            onClick={() => setConsultOpen(true)}
          >
            협진 요청
          </button>
        </div>
      )}

      <ConsultRequestModal
        open={consultOpen}
        onClose={() => setConsultOpen(false)}
        onSubmitted={() => {
          setConsultOpen(false);
          onClose();
        }}
        patient={{ id: patient.id, name: patient.name, bed: patient.bed }}
      />
    </div>
  );
}
