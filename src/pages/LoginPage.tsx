import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/login.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated delay for effect
    setTimeout(() => {
      const success = login(username, password);
      if (success) {
        showToast('Accesso eseguito con successo', 'success');
        navigate(from, { replace: true });
      } else {
        showToast('Credenziali non valide', 'error');
        setLoading(false);
      }
    }, 800);
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
          <h1>Gestione Clinica</h1>
          <p>Inserisci le tue credenziali per accedere</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <i className="ph ph-user" />
              <input 
                type="text" 
                placeholder="es. admin" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
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

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? (
              <i className="ph ph-circle-notch animate-spin" />
            ) : (
              <>Accedi <i className="ph ph-arrow-right" /></>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Assistenza tecnica: <span>supporto@clinica.it</span></p>
        </div>
      </div>
    </div>
  );
}
