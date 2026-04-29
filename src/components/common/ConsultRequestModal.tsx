import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import type {
  ConsultPriority,
  ConsultRecipient,
  StaffMember,
} from '../../types';
import {
  createConsultation,
  getDepartments,
} from '../../api/services/consultService';
import './ConsultRequestModal.css';

interface ConsultRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  patient: {
    id: string;
    name: string;
    bed: string;
  };
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

  const departments = useMemo(() => getDepartments(), []);

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [recipients, setRecipients] = useState<ConsultRecipient[]>([]);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<ConsultPriority>('routine');
  const [submitted, setSubmitted] = useState(false);

  // ESC 닫기 + 포커스 + 모달 열림 효과
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    closeBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // 모달이 닫히면 폼 상태 초기화 + 타이머 정리
  useEffect(() => {
    if (open) return;
    setExpandedDepts(new Set());
    setRecipients([]);
    setReason('');
    setPriority('routine');
    setSubmitted(false);
    if (autoCloseTimerRef.current != null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, [open]);

  // 언마운트 시 타이머 정리
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

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const isRecipientAdded = (staffId: string) =>
    recipients.some((r) => r.staffId === staffId);

  const addRecipient = (staff: StaffMember, deptName: string) => {
    if (isRecipientAdded(staff.id)) return;
    setRecipients((prev) => [
      ...prev,
      {
        staffId: staff.id,
        name: staff.name,
        department: deptName,
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
    !submitted && recipients.length > 0 && reason.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createConsultation({
      patientId: patient.id,
      patientName: patient.name,
      patientBed: patient.bed,
      recipients,
      priority,
      reason: reason.trim(),
    });
    setSubmitted(true);
    autoCloseTimerRef.current = window.setTimeout(() => {
      onSubmitted();
    }, AUTO_CLOSE_MS);
  };

  const handleSuccessClose = () => {
    if (autoCloseTimerRef.current != null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    onSubmitted();
  };

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
              {patient.name} ({patient.bed}) · {patient.id}
            </div>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">부서/담당자 선택</h3>
              <div className="consult-modal__tree" role="tree">
                {departments.map((dept) => {
                  const expanded = expandedDepts.has(dept.id);
                  return (
                    <div key={dept.id} className="consult-modal__dept" role="treeitem" aria-expanded={expanded}>
                      <button
                        type="button"
                        className="consult-modal__dept-head"
                        onClick={() => toggleDept(dept.id)}
                      >
                        {expanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        <span className="consult-modal__dept-name">{dept.name}</span>
                        <span className="consult-modal__dept-count">
                          ({dept.members.length})
                        </span>
                      </button>
                      {expanded && (
                        <ul className="consult-modal__staff-list">
                          {dept.members.map((staff) => {
                            const added = isRecipientAdded(staff.id);
                            return (
                              <li key={staff.id}>
                                <button
                                  type="button"
                                  className={`consult-modal__staff ${added ? 'is-added' : ''}`}
                                  onClick={() => addRecipient(staff, dept.name)}
                                  disabled={added}
                                >
                                  <span
                                    className={`consult-modal__staff-dot ${
                                      staff.available
                                        ? 'is-available'
                                        : 'is-unavailable'
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <span className="consult-modal__staff-name">
                                    {staff.name}
                                  </span>
                                  <span className="consult-modal__staff-role">
                                    · {staff.role}
                                  </span>
                                  {!staff.available && (
                                    <span className="consult-modal__staff-absent">
                                      (부재중)
                                    </span>
                                  )}
                                  {added && (
                                    <span className="consult-modal__staff-added" aria-label="추가됨">
                                      ✓
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">
                수신자
                <span className="consult-modal__section-count">
                  {recipients.length}
                </span>
              </h3>
              {recipients.length === 0 ? (
                <p className="consult-modal__hint">
                  부서를 펼쳐 담당자를 클릭해 추가하세요.
                </p>
              ) : (
                <ul className="consult-modal__chip-list">
                  {recipients.map((r) => (
                    <li key={r.staffId}>
                      <span className={`consult-modal__chip consult-modal__chip--${r.role}`}>
                        <button
                          type="button"
                          className="consult-modal__chip-role"
                          onClick={() => toggleRecipientRole(r.staffId)}
                          aria-label={`${r.name} 역할 전환`}
                        >
                          {r.role === 'to' ? '수신' : '참조'}
                        </button>
                        <span className="consult-modal__chip-name">
                          {r.name} ({r.department})
                        </span>
                        <button
                          type="button"
                          className="consult-modal__chip-remove"
                          onClick={() => removeRecipient(r.staffId)}
                          aria-label={`${r.name} 제거`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="consult-modal__section">
              <h3 className="consult-modal__section-title">요청 사유</h3>
              <textarea
                className="consult-modal__reason"
                placeholder="협진 요청 사유를 입력하세요"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                aria-label="협진 요청 사유"
              />
            </section>

            <section className="consult-modal__section consult-modal__section--row">
              <h3 className="consult-modal__section-title">우선순위</h3>
              <div className="consult-modal__priority" role="radiogroup" aria-label="우선순위">
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
                      {r.name} ({r.department})
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
