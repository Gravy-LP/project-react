import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = useRef<number>();

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ id: Date.now(), message, type });
    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastNotification key={toast.id} message={toast.message} type={toast.type} />}
    </ToastContext.Provider>
  );
}

function ToastNotification({ message, type }: { message: string; type: 'success' | 'error' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        padding: '16px 24px',
        borderRadius: '12px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        transform: visible ? 'translateY(0)' : 'translateY(100px)',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.9rem',
        background: type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
      }}
    >
      <i className={`ph ph-${type === 'success' ? 'check-circle' : 'warning-circle'}`} style={{ fontSize: '1.2rem' }} />
      {message}
    </div>
  );
}
