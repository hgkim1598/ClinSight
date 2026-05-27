import { X } from 'lucide-react';

/**
 * Modal 내부에서 staff 선택 정보를 표시하기 위한 view-model.
 * ConsultRecipient는 staff_id + department_code만 갖지만, 표시에는 displayName이 필요해
 * 모달이 자체적으로 부서/이름을 결합한 형태로 보관한다.
 */
export interface SelectedRecipient {
  staffId: string;
  departmentCode: string;
  displayName: string;
  departmentDisplayName: string;
  role: 'to' | 'cc';
}

interface RecipientChipsProps {
  recipients: SelectedRecipient[];
  onRemove: (staffId: string) => void;
}

export default function RecipientChips({
  recipients,
  onRemove,
}: RecipientChipsProps) {
  if (recipients.length === 0) {
    return (
      <p className="consult-modal__hint">
        부서를 펼쳐 담당자를 클릭해 추가하세요.
      </p>
    );
  }

  return (
    <ul className="consult-modal__chip-list">
      {recipients.map((r) => (
        <li key={r.staffId}>
          <span className={`consult-modal__chip consult-modal__chip--${r.role}`}>
            <span className="consult-modal__chip-name">
              {r.displayName} ({r.departmentDisplayName})
            </span>
            <button
              type="button"
              className="consult-modal__chip-remove"
              onClick={() => onRemove(r.staffId)}
              aria-label={`${r.displayName} 제거`}
            >
              <X size={12} />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
