import { NavLink } from 'react-router-dom';
import '../styles/sidebar.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="mobile-overlay active" onClick={onClose} />
      )}

      {/* Mobile toggle button rendered by the parent page */}

      <aside className={`sidebar glass-panel ${isOpen ? 'active' : ''}`}>
        <div className="logo">
          <div className="brand">
            <i className="ph-fill ph-calendar-check" />
            <span>AptBooker</span>
          </div>
          <button className="close-sidebar-btn" onClick={onClose} aria-label="Close menu">
            <i className="ph ph-x" />
          </button>
        </div>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-squares-four" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-calendar" />
            <span>Calendario</span>
          </NavLink>
          <NavLink to="/incoming-bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-calendar-plus" />
            <span>Prenotazioni in Arrivo</span>
          </NavLink>
          <NavLink to="/rubrica" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <i className="ph ph-address-book" />
            <span>Rubrica</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="nav-item">
            <i className="ph ph-sign-out" />
            <span>Esci</span>
          </a>
        </div>
      </aside>
    </>
  );
}
