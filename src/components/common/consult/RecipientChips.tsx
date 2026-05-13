import { X } from 'lucide-react';

/**
 * Modal 내부에서 staff 선택 정보를 표시하기 위한 view-model.
 * ConsultRecipient는 staff_id + department_code만 갖지만, 표시에는 displayName이 필요해
 * 모달이 자체적으로 부서/이름을 결합한 형태로 보관한다.
 *
 * 단일 수신자 모델 (피드백 §7-1) — `role: 'to'`로 고정.
 */
export interface SelectedRecipient {
  staffId: string;
  departmentCode: string;
  displayName: string;
  departmentDisplayName: string;
  role: 'to';
}

interface RecipientChipsProps {
  recipient: SelectedRecipient | null;
  /** 단일 수신자 모드 — 선택 해제만 가능 (역할 토글 없음). */
  onRemove: () => void;
}

export default function RecipientChips({
  recipient,
  onRemove,
}: RecipientChipsProps) {
  if (!recipient) {
    return (
      <p className="consult-modal__hint">
        부서를 펼쳐 한 명의 담당자를 선택하세요. 다른 사람을 선택하면 교체됩니다.
      </p>
    );
  }

  return (
    <ul className="consult-modal__chip-list">
      <li key={recipient.staffId}>
        <span className="consult-modal__chip consult-modal__chip--to">
          <span className="consult-modal__chip-role consult-modal__chip-role--static">
            수신
          </span>
          <span className="consult-modal__chip-name">
            {recipient.displayName} ({recipient.departmentDisplayName})
          </span>
          <button
            type="button"
            className="consult-modal__chip-remove"
            onClick={onRemove}
            aria-label={`${recipient.displayName} 선택 해제`}
          >
            <X size={12} />
          </button>
        </span>
      </li>
    </ul>
  );
}
