import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { CheckCircle, X } from 'lucide-react';
import type { ConsultPriority, PatientDetail, StaffMember } from '../../types';
import {
  createConsultation,
  getDepartments,
} from '../../api/services/consultationService';
import { formatPatientName } from '../../utils/formatPatientName';
import { showToast } from '../../utils/toast';
import { useAsync } from '../../hooks/useAsync';
import DepartmentTree from './consult/DepartmentTree';
import RecipientChips, {
  type SelectedRecipient,
} from './consult/RecipientChips';
import './ConsultRequestModal.css';

interface ConsultRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  patient: PatientDetail;
}

const AUTO_CLOSE_MS = 2000;

export default function ConsultRequestModal({
  open,
  onClose,
  onSubmitted,
  patient,
}: ConsultRequestModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const { data: departmentsData } = useAsync(() => getDepartments(), []);
  const departments = departmentsData ?? [];

  const [recipients, setRecipients] = useState<SelectedRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<ConsultPriority>('routine');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const recipientIds = useMemo(
    () => new Set(recipients.map((r) => r.staffId)),
    [recipients],
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    closeBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setRecipients([]);
      setSubject('');
      setMessage('');
      setPriority('routine');
      setSubmitted(false);
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (open) return;
    if (autoCloseTimerRef.current != null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current != null) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  if (!open) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const addRecipient = (staff: StaffMember, deptDisplayName: string) => {
    if (recipientIds.has(staff.staffId)) return;
    setRecipients((prev) => [
      ...prev,
      {
        staffId: staff.staffId,
        departmentCode: staff.primaryDepartmentCode,
        displayName: staff.displayName,
        departmentDisplayName: deptDisplayName,
        role: 'to',
      },
    ]);
  };

  const toggleRecipientRole = (staffId: string) => {
    setRecipients((prev) =>
      prev.map((r) =>
        r.staffId === staffId ? { ...r, role: r.role === 'to' ? 'cc' : 'to' } : r,
      ),
    );
  };

  const removeRecipient = (staffId: string) => {
    setRecipients((prev) => prev.filter((r) => r.staffId !== staffId));
  };

  const canSubmit =
    !submitted && !submitting && recipients.length > 0 && subject.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createConsultation({
        stayToken: patient.stayToken,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        recipients: recipients.map((r) => ({
          departmentCode: r.departmentCode,
          staffId: r.staffId,
          role: r.role,
        })),
      });
      setSubmitted(true);
      autoCloseTimerRef.current = window.setTimeout(() => {
        showToast({
          message: '협진 요청이 전송되었습니다',
          type: 'success',
          duration: 3000,
        });
        onSubmitted();
      }, AUTO_CLOSE_MS);
    } catch (e) {
      void e;
      showToast({
        message: '협진 요청 전송에 실패했습니다',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    if (autoCloseTimerRef.current != null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    showToast({
      message: '협진 요청이 전송되었습니다',
      type: 'success',
      duration: 3000,
    });
    onSubmitted();
  };

  const displayName = formatPatientName(patient.patientToken);

  return (
    <div
      className="consult-modal__overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="협진 요청"
    >
      <div className="consult-modal">
        {!submitted ? (
          <>
            <header className="consult-modal__head">
              <h2 className="consult-modal__title">협진 요청</h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="consult-modal__close"
                onClick={onClose}
                aria-label="협진 요청 닫기"
              >
                <X size={18} />
              </button>
            </header>

            <div className="consult-modal__patient">
              {displayName} ({patient.currentBedLabel}) · {patient.patientToken}
            </div>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">부서/담당자 선택</h3>
              <DepartmentTree
                departments={departments}
                selectedIds={recipientIds}
                onSelect={addRecipient}
              />
            </section>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">
                수신자
                <span className="consult-modal__section-count">
                  {recipients.length}
                </span>
              </h3>
              <RecipientChips
                recipients={recipients}
                onToggleRole={toggleRecipientRole}
                onRemove={removeRecipient}
              />
            </section>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">제목</h3>
              <input
                type="text"
                className="consult-modal__reason"
                placeholder="협진 요청 제목 (필수)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="협진 요청 제목"
              />
            </section>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">요청 사유</h3>
              <textarea
                className="consult-modal__reason"
                placeholder="협진 요청 사유를 입력하세요 (선택)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                aria-label="협진 요청 사유"
              />
            </section>

            <section className="consult-modal__section consult-modal__section--row">
              <h3 className="consult-modal__section-title">우선순위</h3>
              <div
                className="consult-modal__priority"
                role="radiogroup"
                aria-label="우선순위"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={priority === 'urgent'}
                  className={`consult-modal__priority-btn consult-modal__priority-btn--urgent ${
                    priority === 'urgent' ? 'is-active' : ''
                  }`}
                  onClick={() => setPriority('urgent')}
                >
                  긴급
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={priority === 'routine'}
                  className={`consult-modal__priority-btn ${
                    priority === 'routine' ? 'is-active' : ''
                  }`}
                  onClick={() => setPriority('routine')}
                >
                  일반
                </button>
              </div>
            </section>

            <footer className="consult-modal__footer">
              <button
                type="button"
                className="consult-modal__btn consult-modal__btn--ghost"
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="button"
                className="consult-modal__btn consult-modal__btn--primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                협진 요청 전송
              </button>
            </footer>
          </>
        ) : (
          <div className="consult-modal__success">
            <CheckCircle size={48} className="consult-modal__success-icon" />
            <h2 className="consult-modal__success-title">
              협진 요청이 전달되었습니다
            </h2>
            <ul className="consult-modal__success-list">
              {recipients.map((r) => (
                <li key={r.staffId}>
                  <span className={`consult-modal__chip consult-modal__chip--${r.role}`}>
                    <span className="consult-modal__chip-role consult-modal__chip-role--static">
                      {r.role === 'to' ? '수신' : '참조'}
                    </span>
                    <span className="consult-modal__chip-name">
                      {r.displayName} ({r.departmentDisplayName})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="consult-modal__btn consult-modal__btn--primary"
              onClick={handleSuccessClose}
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
