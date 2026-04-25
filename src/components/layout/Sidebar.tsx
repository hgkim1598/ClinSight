import type { ComponentType, SVGProps } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Bell,
  ClipboardList,
  UserPlus,
  BookOpen,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggle: () => void;
}

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

interface NavItem {
  icon: IconType;
  label: string;
  to?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '모니터링',
    items: [
      { icon: LayoutDashboard, label: 'ICU 현황', to: '/' },
      { icon: Bell, label: '알림 센터' },
    ],
  },
  {
    label: '환자 관리',
    items: [
      { icon: ClipboardList, label: '인계 노트' },
      { icon: UserPlus, label: '협진 요청' },
    ],
  },
  {
    label: '설정',
    items: [
      { icon: BookOpen, label: '가이드라인' },
      { icon: Settings, label: '시스템 설정' },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();

  const className = [
    'sidebar',
    collapsed ? 'sidebar--collapsed' : '',
    mobileOpen ? 'sidebar--open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={className}>
      <button
        type="button"
        className="sidebar__logo"
        onClick={() => navigate('/')}
        aria-label="ICU 현황으로 이동"
      >
        <span className="sidebar__logo-mark">
          <Activity size={18} />
        </span>
        {!collapsed && (
          <span className="sidebar__logo-text">
            <strong>ClinSight</strong>
          </span>
        )}
      </button>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div className="sidebar__group" key={group.label}>
            {!collapsed && <span className="sidebar__nav-label">{group.label}</span>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const inner = (
                <>
                  <span className="sidebar__icon">
                    <Icon size={18} />
                  </span>
                  {!collapsed && <span className="sidebar__item-label">{item.label}</span>}
                </>
              );

              if (item.to) {
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
                    }
                  >
                    {inner}
                  </NavLink>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  className="sidebar__item"
                  title={collapsed ? item.label : undefined}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar__toggle"
        onClick={onToggle}
        aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
      >
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        {!collapsed && <span>메뉴 접기</span>}
      </button>
    </aside>
  );
}
