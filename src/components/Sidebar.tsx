import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

import { useTranslation } from '../context/LanguageContext';

export default function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
  const { t } = useTranslation();
  const { role } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="mobile-overlay active" onClick={onClose} />
      )}

      <aside 
        className={`sidebar glass-panel ${isOpen ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      >
        <div className="logo-mobile-only">
          <button className="close-sidebar-btn" onClick={onClose} aria-label="Close menu">
            <i className="ph ph-x" />
          </button>
        </div>

        <nav className="nav-links">
          {(role === 'administrator' || role === 'viewer') && (
            <>
              <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="ph ph-squares-four" />
                <span className="sidebar-label">{t('sidebar.dashboard')}</span>
              </NavLink>
              <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="ph ph-calendar" />
                <span className="sidebar-label">{t('sidebar.calendar')}</span>
              </NavLink>
              <NavLink to="/incoming-bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="ph ph-calendar-plus" />
                <span className="sidebar-label">{t('sidebar.bookings')}</span>
              </NavLink>
              <NavLink to="/rubrica" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="ph ph-address-book" />
                <span className="sidebar-label">{t('sidebar.contacts')}</span>
              </NavLink>
            </>
          )}
          
          {role === 'user' && (
            <>
              <NavLink to="/profilo" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="ph ph-user" />
                <span className="sidebar-label">{t('my_profile.personal_info')}</span>
              </NavLink>
              <NavLink to="/my-appointments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="ph ph-calendar" />
                <span className="sidebar-label">Le mie Prenotazioni</span>
              </NavLink>
              <NavLink to="/book" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="ph ph-calendar-plus" />
                <span className="sidebar-label">Prenota</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
