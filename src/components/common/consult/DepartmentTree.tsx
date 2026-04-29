import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Department, StaffMember } from '../../../types';

interface DepartmentTreeProps {
  departments: Department[];
  /** 이미 추가된 staffId 집합 — 트리에서 disabled 처리에 사용 */
  selectedIds: Set<string>;
  /** 인물 클릭 시 호출. 부서명도 함께 전달. */
  onSelect: (staff: StaffMember, deptName: string) => void;
}

export default function DepartmentTree({
  departments,
  selectedIds,
  onSelect,
}: DepartmentTreeProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  return (
    <div className="consult-modal__tree" role="tree">
      {departments.map((dept) => {
        const expanded = expandedDepts.has(dept.id);
        return (
          <div
            key={dept.id}
            className="consult-modal__dept"
            role="treeitem"
            aria-expanded={expanded}
          >
            <button
              type="button"
              className="consult-modal__dept-head"
              onClick={() => toggleDept(dept.id)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="consult-modal__dept-name">{dept.name}</span>
              <span className="consult-modal__dept-count">
                ({dept.members.length})
              </span>
            </button>
            {expanded && (
              <ul className="consult-modal__staff-list">
                {dept.members.map((staff) => {
                  const added = selectedIds.has(staff.id);
                  return (
                    <li key={staff.id}>
                      <button
                        type="button"
                        className={`consult-modal__staff ${added ? 'is-added' : ''}`}
                        onClick={() => onSelect(staff, dept.name)}
                        disabled={added}
                      >
                        <span
                          className={`consult-modal__staff-dot ${
                            staff.available ? 'is-available' : 'is-unavailable'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="consult-modal__staff-name">{staff.name}</span>
                        <span className="consult-modal__staff-role">· {staff.role}</span>
                        {!staff.available && (
                          <span className="consult-modal__staff-absent">(부재중)</span>
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
  );
}
