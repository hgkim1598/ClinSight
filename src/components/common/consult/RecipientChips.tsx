import { X } from 'lucide-react';
import type { ConsultRecipient } from '../../../types';

interface RecipientChipsProps {
  recipients: ConsultRecipient[];
  onToggleRole: (staffId: string) => void;
  onRemove: (staffId: string) => void;
}

export default function RecipientChips({
  recipients,
  onToggleRole,
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
            <button
              type="button"
              className="consult-modal__chip-role"
              onClick={() => onToggleRole(r.staffId)}
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
              onClick={() => onRemove(r.staffId)}
              aria-label={`${r.name} 제거`}
            >
              <X size={12} />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
