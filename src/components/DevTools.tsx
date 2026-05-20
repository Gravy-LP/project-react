import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DevTools() {
  const { role, setRole, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Only render in development AND if the actual database user is an administrator
  const isRealAdmin = profile?.role === 'owner' || profile?.role === 'administrator';
  
  if (process.env.NODE_ENV !== 'development' || !setRole || !isRealAdmin) {
    return null;
  }

  return (
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
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
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
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>DEV TOOLS</p>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 5px' }}
            >
              <i className="ph ph-x" />
            </button>
          </div>
          
          {/* Tool 1: Role Switcher */}
          <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simulate Role</p>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                style={{ padding: '5px', fontSize: '12px', background: role === 'administrator' ? 'var(--color-primary)' : 'transparent', color: '#fff', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setRole('administrator')}
              >Admin</button>
              <button 
                style={{ padding: '5px', fontSize: '12px', background: role === 'manager' ? 'var(--color-primary)' : 'transparent', color: '#fff', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setRole('manager')}
              >Manager</button>
              <button 
                style={{ padding: '5px', fontSize: '12px', background: role === 'viewer' ? 'var(--color-primary)' : 'transparent', color: '#fff', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setRole('viewer')}
              >Viewer</button>
              <button 
                style={{ padding: '5px', fontSize: '12px', background: role === 'user' ? 'var(--color-primary)' : 'transparent', color: '#fff', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setRole('user')}
              >User</button>
            </div>
          </div>

          {/* Add more tools here in the future */}
          {/* 
          <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Tool Area</p>
            ...
          </div> 
          */}

        </div>
      )}
    </div>
  );
}
