import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { StaffMember } from '../../../types';
import { dutyStatusInfo, type DeptGroup } from '../../../utils/departments';

interface DepartmentTreeProps {
  /** 부서별로 그루핑된 의료진 (부모가 /staff 1회 조회 후 그루핑해서 전달). */
  groups: DeptGroup[];
  /** 이미 추가된 staffId 집합 — 트리에서 disabled 처리에 사용 */
  selectedIds: Set<string>;
  /** 인물 클릭 시 호출. 부서 표시명도 함께 전달. */
  onSelect: (staff: StaffMember, deptDisplayName: string) => void;
}

export default function DepartmentTree({
  groups,
  selectedIds,
  onSelect,
}: DepartmentTreeProps) {
  // 부서별 펼침 상태 — 부서 코드가 고유 키. (코드 단위라 아코디언이 독립 동작)
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const toggleDept = (deptKey: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptKey)) next.delete(deptKey);
      else next.add(deptKey);
      return next;
    });
  };

  return (
    <div className="consult-modal__tree" role="tree">
      {groups.map((group) => {
        const expanded = expandedDepts.has(group.code);
        const staffList = group.staff;
        return (
          <div
            key={group.code}
            className="consult-modal__dept"
            role="treeitem"
            aria-expanded={expanded}
          >
            <button
              type="button"
              className="consult-modal__dept-head"
              onClick={() => toggleDept(group.code)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="consult-modal__dept-name">{group.displayName}</span>
              {staffList.length > 0 && (
                <span className="consult-modal__dept-count">
                  ({staffList.length})
                </span>
              )}
            </button>
            {expanded && (
              <ul className="consult-modal__staff-list">
                {staffList.map((staff) => {
                  const added = selectedIds.has(staff.staffId);
                  const duty = dutyStatusInfo(staff.dutyStatus);
                  return (
                    <li key={staff.staffId}>
                      <button
                        type="button"
                        className={`consult-modal__staff ${added ? 'is-added' : ''}`}
                        onClick={() => onSelect(staff, group.displayName)}
                        disabled={added}
                      >
                        <span
                          className={`consult-modal__staff-dot consult-modal__staff-dot--${duty.level}`}
                          aria-hidden="true"
                        />
                        <span className="consult-modal__staff-name">{staff.displayName}</span>
                        <span className="consult-modal__staff-role">· {staff.role}</span>
                        <span
                          className={`consult-modal__staff-duty consult-modal__staff-duty--${duty.level}`}
                        >
                          {duty.label}
                        </span>
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
  );
}
