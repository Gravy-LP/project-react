import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/sidebar.css';
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, setIsCollapsed }: SidebarProps) {
  const [isHoverLocked, setIsHoverLocked] = useState(false);

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setIsHoverLocked(true);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="mobile-overlay active" onClick={onClose} />
      )}

      <aside 
        className={`sidebar glass-panel ${isOpen ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''} ${isHoverLocked ? 'hover-locked' : ''}`}
        onMouseLeave={() => setIsHoverLocked(false)}
      >
        <div className="logo-mobile-only">
          <button className="close-sidebar-btn" onClick={onClose} aria-label="Close menu">
            <i className="ph ph-x" />
          </button>
        </div>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-squares-four" />
            <span className="sidebar-label">Dashboard</span>
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-calendar" />
            <span className="sidebar-label">Calendario</span>
          </NavLink>
          <NavLink to="/incoming-bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-calendar-plus" />
            <span className="sidebar-label">Prenotazioni</span>
          </NavLink>
          <NavLink to="/rubrica" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-address-book" />
            <span className="sidebar-label">Rubrica</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item collapse-btn" onClick={handleCollapse}>
            <i className={isCollapsed ? "ph ph-caret-right" : "ph ph-caret-left"} />
            <span className="sidebar-label">{isCollapsed ? 'Espandi' : 'Comprimi'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
