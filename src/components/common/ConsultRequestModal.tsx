import { useEffect, useRef, useState } from 'react';
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

/** §7-2 의뢰서 양식 가이드 — message placeholder. */
const MESSAGE_TEMPLATE =
  '상기환자는 OO세 O환자, OO으로 입원함\n(상세 내용 기술)\n고신 선처 부탁드립니다\n감사합니다';

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

  // 단일 수신자 모델 (피드백 §7-1) — 다른 사람을 클릭하면 교체된다.
  const [recipient, setRecipient] = useState<SelectedRecipient | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<ConsultPriority>('routine');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setRecipient(null);
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

  /**
   * 단일 수신자 모델 — 이미 누군가 선택된 상태에서 다른 staff를 클릭하면 교체된다.
   * (피드백 §7-1: 의견 분산 방지를 위해 한 명에게만 보냄)
   */
  const setRecipientFromStaff = (staff: StaffMember, deptDisplayName: string) => {
    setRecipient({
      staffId: staff.staffId,
      departmentCode: staff.primaryDepartmentCode,
      displayName: staff.displayName,
      departmentDisplayName: deptDisplayName,
      role: 'to',
    });
  };

  const clearRecipient = () => setRecipient(null);

  const canSubmit =
    !submitted && !submitting && recipient != null && subject.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !recipient) return;
    setSubmitting(true);
    try {
      await createConsultation({
        stayToken: patient.stayToken,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        recipients: [
          {
            departmentCode: recipient.departmentCode,
            staffId: recipient.staffId,
            role: 'to',
          },
        ],
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
                selectedStaffId={recipient?.staffId ?? null}
                onSelect={setRecipientFromStaff}
              />
            </section>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">수신자</h3>
              <RecipientChips recipient={recipient} onRemove={clearRecipient} />
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
                placeholder={MESSAGE_TEMPLATE}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
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
              {recipient && (
                <li key={recipient.staffId}>
                  <span className="consult-modal__chip consult-modal__chip--to">
                    <span className="consult-modal__chip-role consult-modal__chip-role--static">
                      수신
                    </span>
                    <span className="consult-modal__chip-name">
                      {recipient.displayName} ({recipient.departmentDisplayName})
                    </span>
                  </span>
                </li>
              )}
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
