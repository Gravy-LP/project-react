import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getInitials } from '../lib/formatters';
import '../styles/my-profile.css';

export default function MyProfilePage() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();

  if (!user) return null;

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || t('common.user');
  const initials = getInitials(fullName);

  return (
    <Layout>
      <div className="profile-container animate-in">
        <header className="profile-header-main">
          <div className="profile-avatar-large">
            {initials}
            <div className="avatar-badge"><i className="ph-fill ph-seal-check" /></div>
          </div>
          <div className="profile-title-section">
            <h1>{fullName}</h1>
            <p className="profile-role-tag">{t('my_profile.admin')}</p>
          </div>
        </header>

        <div className="profile-grid-layout">
          <div className="profile-main-column">
            <section className="profile-section-card glass-panel">
              <div className="section-header">
                <i className="ph ph-user-circle" />
                <h3>{t('my_profile.personal_info')}</h3>
              </div>
              <div className="info-grid-premium">
                <div className="info-box">
                  <label>{t('my_profile.email')}</label>
                  <span>{user.email}</span>
                </div>
                <div className="info-box">
                  <label>{t('my_profile.role')}</label>
                  <span>{t('my_profile.admin')}</span>
                </div>
                <div className="info-box">
                  <label>{t('my_profile.last_login')}</label>
                  <span>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</span>
                </div>
              </div>
            </section>

            <section className="profile-section-card glass-panel">
              <div className="section-header">
                <i className="ph ph-shield-check" />
                <h3>{t('my_profile.security')}</h3>
              </div>
              <div className="action-row">
                <div className="action-info">
                  <p>{t('my_profile.change_password')}</p>
                  <span>Aggiorna la tua password per mantenere l'account sicuro.</span>
                </div>
                <button className="btn btn-secondary">{t('common.save')}</button>
              </div>
            </section>
          </div>

          <div className="profile-side-column">
            <section className="profile-section-card glass-panel">
              <div className="section-header">
                <i className="ph ph-gear" />
                <h3>{t('my_profile.app_settings')}</h3>
              </div>
              
              <div className="setting-item-premium">
                <div className="setting-info">
                  <i className={isDarkMode ? "ph ph-moon" : "ph ph-sun"} />
                  <span>{t('common.theme')} {isDarkMode ? t('common.dark') : t('common.light')}</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item-premium">
                <div className="setting-info">
                  <i className="ph ph-translate" />
                  <span>{t('common.language')}</span>
                </div>
                <select 
                  className="premium-select"
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

              <div className="divider-premium" />

              <button className="btn btn-danger btn-full" onClick={logout}>
                <i className="ph ph-sign-out" /> {t('common.logout')}
              </button>
            </section>

            <section className="stats-mini-card glass-panel">
              <div className="mini-stat">
                <span className="stat-num">v1.2.0</span>
                <span className="stat-label">Version</span>
              </div>
              <div className="mini-stat">
                <span className="stat-num">PRO</span>
                <span className="stat-label">Plan</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
