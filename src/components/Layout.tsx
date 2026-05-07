import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import '../styles/account-menu.css';

interface LayoutProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export default function Layout({ children, headerActions }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      className="dashboard-layout"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background ambient shapes */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-toggle" id="mobileMenuBtn" onClick={() => setIsMobileMenuOpen(true)}>
              <i className="ph ph-list" />
            </button>
            {headerActions}
          </div>
          <div className="header-right">
            <GlobalSearch />
            <NotificationBell />
            
            <div className="account-menu-container" ref={accountMenuRef}>
              <div 
                className="avatar" 
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                style={{ cursor: 'pointer' }}
              >
                <img src="https://i.pravatar.cc/100?img=33" alt="User Avatar" />
              </div>
              
              <div className={`account-dropdown glass-panel ${isAccountMenuOpen ? 'open' : ''}`}>
                <div className="account-dropdown-header">
                  <div className="account-name">Dr. Rossi</div>
                  <div className="account-role">Amministratore</div>
                </div>
                <div className="account-dropdown-body">
                  <Link to="/impostazioni" className="account-item">
                    <i className="ph ph-gear" />
                    <span>Impostazioni</span>
                  </Link>
                  <Link to="/profilo" className="account-item">
                    <i className="ph ph-user" />
                    <span>Il mio profilo</span>
                  </Link>
                  <Link to="/bin" className="account-item">
                    <i className="ph ph-trash" />
                    <span>Cestino</span>
                  </Link>
                  <div className="account-divider"></div>
                  <button className="account-item logout" onClick={logout}>
                    <i className="ph ph-sign-out" />
                    <span>Esci</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
