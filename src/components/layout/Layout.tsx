import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
      const check = () => {
        const mobile = window.innerWidth <= 768;
        setIsMobile(mobile);
        if (mobile) setMobileOpen(false);
      };
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    }, []);

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className={`layout ${collapsed ? 'layout--collapsed' : ''}`}>
      {isMobile && mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <Sidebar
        collapsed={isMobile ? false : collapsed}
        mobileOpen={isMobile ? mobileOpen : undefined}
        onToggle={handleToggle}
      />

      {isMobile && !mobileOpen && (
        <button className="layout__mobile-toggle" onClick={handleToggle}>
          ☰
        </button>
      )}

      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
}