import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Department, StaffMember } from '../../../types';
import { getStaff } from '../../../api/services/consultationService';

interface DepartmentTreeProps {
  departments: Department[];
  /** 현재 선택된 staff_id. 단일 수신자 모델 (피드백 §7-1). */
  selectedStaffId: string | null;
  /** 인물 클릭 시 호출. 단일 수신자로 교체된다. 부서 표시명도 함께 전달. */
  onSelect: (staff: StaffMember, deptDisplayName: string) => void;
}

export default function DepartmentTree({
  departments,
  selectedStaffId,
  onSelect,
}: DepartmentTreeProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [staffByDept, setStaffByDept] = useState<Record<string, StaffMember[]>>({});

  const toggleDept = (deptKey: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptKey)) next.delete(deptKey);
      else next.add(deptKey);
      return next;
    });
  };

  // 펼친 부서 중 아직 staff 안 받은 곳은 lazily 로드
  useEffect(() => {
    const toFetch = Array.from(expandedDepts).filter((k) => !staffByDept[k]);
    if (toFetch.length === 0) return;
    let cancelled = false;
    void (async () => {
      const updates: Record<string, StaffMember[]> = {};
      for (const code of toFetch) {
        updates[code] = await getStaff(code);
      }
      if (!cancelled) setStaffByDept((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedDepts, staffByDept]);

  return (
    <div className="consult-modal__tree" role="tree">
      {departments.map((dept) => {
        const expanded = expandedDepts.has(dept.configKey);
        const staffList = staffByDept[dept.configKey] ?? [];
        return (
          <div
            key={dept.configKey}
            className="consult-modal__dept"
            role="treeitem"
            aria-expanded={expanded}
          >
            <button
              type="button"
              className="consult-modal__dept-head"
              onClick={() => toggleDept(dept.configKey)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="consult-modal__dept-name">{dept.displayName}</span>
              {staffList.length > 0 && (
                <span className="consult-modal__dept-count">
                  ({staffList.length})
                </span>
              )}
            </button>
            {expanded && (
              <ul className="consult-modal__staff-list">
                {staffList.map((staff) => {
                  const isSelected = selectedStaffId === staff.staffId;
                  const available = staff.status === 'active';
                  return (
                    <li key={staff.staffId}>
                      <button
                        type="button"
                        className={`consult-modal__staff ${isSelected ? 'is-added' : ''}`}
                        onClick={() => onSelect(staff, dept.displayName)}
                        aria-pressed={isSelected}
                      >
                        <span
                          className={`consult-modal__staff-dot ${
                            available ? 'is-available' : 'is-unavailable'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="consult-modal__staff-name">{staff.displayName}</span>
                        <span className="consult-modal__staff-role">· {staff.role}</span>
                        {!available && (
                          <span className="consult-modal__staff-absent">(부재중)</span>
                        )}
                        {isSelected && (
                          <span className="consult-modal__staff-added" aria-label="선택됨">
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
