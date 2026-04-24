import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onToggle }: SidebarProps) {
  const className = [
    'sidebar',
    collapsed ? 'sidebar--collapsed' : '',
    mobileOpen ? 'sidebar--open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={className}>
      <div className="sidebar__logo">
        <span className="sidebar__logo-mark">C</span>
        {!collapsed && (
          <div className="sidebar__logo-text">
            <strong>ClinSight</strong>
            <span>ICU · MIMIC-IV</span>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        <span className="sidebar__nav-label">{!collapsed && 'Monitoring'}</span>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
          }
        >
          <span className="sidebar__icon"><LayoutDashboard size={18} /></span>
          {!collapsed && <span>ICU 현황</span>}
        </NavLink>
      </nav>

      <button className="sidebar__toggle" onClick={onToggle}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}