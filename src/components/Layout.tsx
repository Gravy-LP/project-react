import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import { useTheme } from '../context/ThemeContext';
import '../styles/account-menu.css';

interface LayoutProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

import { useTranslation } from '../context/LanguageContext';

export default function Layout({ children, headerActions }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'search' | 'notifications' | 'account' | null>(null);
  const { language, setLanguage, t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const { logout, user, role, setRole } = useAuth();
  const [showDevTools, setShowDevTools] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Handle Account Menu
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        if (activeDropdown === 'account') setActiveDropdown(null);
      }

      // Handle Notifications
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        if (activeDropdown === 'notifications') setActiveDropdown(null);
      }

      // Handle Search
      if (searchRef.current && !searchRef.current.contains(target)) {
        if (activeDropdown === 'search') setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Swipe right to open (only if starting near the left edge)
    if (isRightSwipe && !isMobileMenuOpen && touchStartX < 50) {
      setIsMobileMenuOpen(true);
    }

    // Swipe left to close
    if (isLeftSwipe && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div
      className="dashboard-layout sidebar-collapsed"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background ambient shapes */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={true}
        setIsCollapsed={() => {}}
      />
      <main className="main-content expanded">
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-toggle" id="mobileMenuBtn" onClick={() => setIsMobileMenuOpen(true)}>
              <i className="ph ph-list" />
            </button>
            <div className="header-brand">
              <i className="ph-fill ph-calendar-check" />
              <span>AptBooker</span>
            </div>
            <div className="header-actions-container">
              {headerActions}
            </div>
          </div>
          <div className="header-right">
            {(role === 'administrator' || role === 'viewer') && (
              <>
                <div
                  ref={searchRef}
                  className={`header-item-wrapper ${activeDropdown === 'search' ? 'active-search' : ''}`}
                >
                  <GlobalSearch
                    isOpen={activeDropdown === 'search'}
                    setIsOpen={(val) => setActiveDropdown(val ? 'search' : null)}
                  />
                </div>
                <div ref={notificationRef} className="header-item-wrapper">
                  <NotificationBell
                    isOpen={activeDropdown === 'notifications'}
                    setIsOpen={(val) => setActiveDropdown(val ? 'notifications' : null)}
                  />
                </div>
              </>
            )}

            <div className="account-menu-container" ref={accountMenuRef}>
              <button
                className={`burger-menu ${activeDropdown === 'account' ? 'open' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'account' ? null : 'account')}
                aria-label="Toggle Account Menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              <div className={`account-dropdown glass-panel ${activeDropdown === 'account' ? 'open' : ''}`}>
                <div className="account-dropdown-header">
                  <div className="account-name">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('common.user')}</div>
                  <div className="account-role">{user?.email || t('common.no_login')}</div>
                </div>
                <div className="account-dropdown-body">
                  <div className="account-item no-hover">
                    <i className={isDarkMode ? "ph ph-moon" : "ph ph-sun"} />
                    <span>{t('common.theme')} {isDarkMode ? t('common.dark') : t('common.light')}</span>
                    <label className="toggle-switch-sm">
                      <input
                        type="checkbox"
                        checked={isDarkMode}
                        onChange={toggleTheme}
                      />
                      <span className="slider-sm"></span>
                    </label>
                  </div>

                  <div className="account-item no-hover">
                    <i className="ph ph-translate" />
                    <span>{t('common.language')}</span>
                    <select
                      className="lang-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                    >
                      <option value="IT">Italiano</option>
                      <option value="EN">English</option>
                      <option value="ES">Español</option>
                      <option value="FR">Français</option>
                      <option value="ZH">中文</option>
                    </select>
                  </div>

                  <div className="account-divider"></div>

                  <Link to="/profilo" className="account-item" onClick={() => setActiveDropdown(null)}>
                    <i className="ph ph-user" />
                    <span>{t('common.profile')}</span>
                  </Link>
                  {(role === 'administrator' || role === 'viewer') && (
                    <Link to="/bin" className="account-item" onClick={() => setActiveDropdown(null)}>
                      <i className="ph ph-trash" />
                      <span>{t('common.bin')}</span>
                    </Link>
                  )}

                  <div className="account-divider"></div>
                  <button className="account-item logout" onClick={logout}>
                    <i className="ph ph-sign-out" />
                    <span>{t('common.logout')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>

      {/* DEV ROLE SWITCHER */}
      {process.env.NODE_ENV === 'development' && setRole && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          {!showDevTools ? (
            <button 
              onClick={() => setShowDevTools(true)}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
              title="Dev Tools"
            >
              <i className="ph ph-wrench" />
            </button>
          ) : (
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid var(--color-primary)',
              padding: '10px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>DEV: Role Switcher</p>
                <button 
                  onClick={() => setShowDevTools(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 5px' }}
                >
                  <i className="ph ph-x" />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  style={{ padding: '5px', fontSize: '12px', background: role === 'administrator' ? 'var(--color-primary)' : 'transparent', color: '#fff', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => setRole('administrator')}
                >Admin</button>
                <button 
                  style={{ padding: '5px', fontSize: '12px', background: role === 'viewer' ? 'var(--color-primary)' : 'transparent', color: '#fff', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => setRole('viewer')}
                >Viewer</button>
                <button 
                  style={{ padding: '5px', fontSize: '12px', background: role === 'user' ? 'var(--color-primary)' : 'transparent', color: '#fff', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => setRole('user')}
                >User</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
