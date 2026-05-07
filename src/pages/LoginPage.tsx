import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import '../styles/login.css';

import { useTranslation } from '../context/LanguageContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await login(email, password);
    if (res.success) {
      showToast(t('login.success'), 'success');
      navigate(from, { replace: true });
    } else {
      showToast(res.error || t('login.error'), 'error');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + from
        }
      });
      if (error) throw error;
    } catch (err) {
      showToast((err as Error).message, 'error');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>
      
      <div className="login-card glass-panel animate-in">
        <div className="login-header">
          <div className="login-logo">
             <i className="ph ph-shield-check" />
          </div>
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('login.email')}</label>
            <div className="input-with-icon">
              <i className="ph ph-envelope" />
              <input 
                type="email" 
                placeholder="es. admin@clinica.it" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('login.password')}</label>
            <div className="input-with-icon">
              <i className="ph ph-lock" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading || googleLoading}>
            {loading ? (
              <i className="ph ph-circle-notch animate-spin" />
            ) : (
              <>{t('login.button')} <i className="ph ph-arrow-right" /></>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>{t('login.or')}</span>
        </div>

        <button 
          className="btn btn-secondary google-btn" 
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <i className="ph ph-circle-notch animate-spin" />
          ) : (
            <><i className="ph ph-google-logo" /> {t('login.google')}</>
          )}
        </button>

        <div className="login-footer">
          <p>{t('login.footer')} <span>supporto@clinica.it</span></p>
        </div>
      </div>
    </div>
  );
}

