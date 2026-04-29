import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Printer, X } from 'lucide-react';
import type {
  PatientReport,
  ReportVitalRow,
  RiskLevel,
  VitalStatusLevel,
} from '../../types';
import ConsultRequestModal from './ConsultRequestModal';
import './PatientReportModal.css';

interface PatientReportModalProps {
  open: boolean;
  onClose: () => void;
  report: PatientReport;
  /** true이면 하단 협진 요청 버튼 영역을 렌더링하지 않음 (이미 요청된 건 열람 시 사용) */
  hideConsultButton?: boolean;
}

interface ConsultationNote {
  id: string;
  text: string;
  author: string;
  time: Date;
}

// Cognito 연동 전 placeholder. 인증 연결 시 로그인 사용자명으로 교체될 자리.
const CURRENT_USER_PLACEHOLDER = '담당 의료진';

const STATUS_LABEL: Record<VitalStatusLevel, string> = {
  normal: '정상',
  attention: '주의',
  critical: '위험',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  high: 'HIGH',
  med: 'MED',
  low: 'LOW',
};

function formatDateTime(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

function formatVitalValue(row: ReportVitalRow): string {
  if (row.latestValue == null) return '—';
  // 소숫점 있는 경우만 한 자리 유지
  const rounded = Number.isInteger(row.latestValue)
    ? `${row.latestValue}`
    : row.latestValue.toFixed(1);
  return `${rounded} ${row.unit}`;
}

function makeNoteId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PatientReportModal({
  open,
  onClose,
  report,
  hideConsultButton = false,
}: PatientReportModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
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

  // 모달이 닫혔다가 다시 열리면 메모 + 협진 모달 상태 초기화
  useEffect(() => {
    if (!open) {
      setNotes([]);
      setNoteInput('');
      setConsultOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleAddNote = () => {
    const text = noteInput.trim();
    if (!text) return;
    setNotes((prev) => [
      ...prev,
      {
        id: makeNoteId(),
        text,
        author: CURRENT_USER_PLACEHOLDER,
        time: new Date(),
      },
    ]);
    setNoteInput('');
  };

  const handlePrint = () => {
    window.print();
  };

  const { patient, generatedAt, vitals, labs, predictions } = report;
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

        <section className="report-paper__section">
          <h3 className="report-paper__section-title">환자 기본정보</h3>
          <table className="report-table report-table--info">
            <tbody>
              <tr>
                <th>환자 ID</th>
                <td>{patient.id}</td>
                <th>이름</th>
                <td>{patient.name}</td>
              </tr>
              <tr>
                <th>나이/성별</th>
                <td>{`${patient.age}세 / ${patient.sex}`}</td>
                <th>병상</th>
                <td>{patient.bed}</td>
              </tr>
              <tr>
                <th>입실시간</th>
                <td>{patient.admit}</td>
                <th>주진단</th>
                <td>{patient.diag}</td>
              </tr>
              <tr>
                <th>SOFA</th>
                <td>{patient.sofa}</td>
                <th>Sepsis Onset</th>
                <td>{patient.sepsisOnset ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="report-paper__section">
          <h3 className="report-paper__section-title">
            최근 활력징후 (Latest Vital Signs)
          </h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>지표</th>
                <th>최근 값</th>
                <th>측정 시각</th>
                <th>정상 범위</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="report-table__num">{formatVitalValue(row)}</td>
                  <td>{row.latestTime ?? '—'}</td>
                  <td>
                    {row.normalRange[0]}–{row.normalRange[1]} {row.unit}
                  </td>
                  <td>
                    <span
                      className={`report-pill report-pill--vital report-pill--vital-${row.status}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="report-paper__section">
          <h3 className="report-paper__section-title">
            주요 검사 결과 (Key Lab Results)
          </h3>
          {labs.length === 0 ? (
            <p className="report-paper__empty">
              표시 가능한 검사 결과가 없습니다.
            </p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>검사 항목</th>
                  <th>최근 값</th>
                  <th>측정 시각</th>
                  <th>정상 범위</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((lab) => (
                  <tr key={lab.label}>
                    <td>{lab.label}</td>
                    <td className="report-table__num">
                      {lab.value}
                      {lab.unit ? ` ${lab.unit}` : ''}
                    </td>
                    <td>{lab.time}</td>
                    <td>{lab.normalRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="report-paper__section">
          <h3 className="report-paper__section-title">AI 예후 예측 결과</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>모델</th>
                <th>예측 확률</th>
                <th>위험 등급</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.key}>
                  <td>{p.title}</td>
                  <td className="report-table__num">{p.probability}%</td>
                  <td>
                    <span
                      className={`report-pill report-pill--risk report-pill--risk-${p.risk}`}
                    >
                      {RISK_LABEL[p.risk]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="report-paper__disclaimer">
            AI 생성 예측 결과 · 임상 판단 대체 불가
          </p>
        </section>

        <section className="report-paper__section report-paper__section--notes">
          <h3 className="report-paper__section-title">
            협진 의견 (Consultation Notes)
          </h3>
          {notes.length > 0 && (
            <ul className="report-paper__note-list">
              {notes.map((note) => (
                <li key={note.id} className="report-paper__note">
                  <p className="report-paper__note-text">{note.text}</p>
                  <span className="report-paper__note-meta">
                    {note.author} · {formatDateTime(note.time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="report-modal__note-add">
            <textarea
              className="report-modal__note-textarea"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="협진 관련 메모를 입력하세요..."
              rows={3}
              aria-label="협진 메모 입력"
            />
            <button
              type="button"
              className="report-modal__note-button"
              onClick={handleAddNote}
              disabled={!noteInput.trim()}
            >
              보고서에 추가
            </button>
          </div>
        </section>

        <footer className="report-paper__footer">
          <p>본 보고서는 ClinSight CDSS에 의해 자동 생성되었습니다.</p>
          <p>
            생성자: {CURRENT_USER_PLACEHOLDER} | 생성일시: {generatedAtText}
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
