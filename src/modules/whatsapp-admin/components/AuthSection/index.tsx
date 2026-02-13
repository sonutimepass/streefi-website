'use client';

import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';

export default function AuthSection() {
  const { passwordInput, setPasswordInput, passwordError, handleUnlock } = useWhatsAppAdminContext();
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          WhatsApp Admin
        </h1>
        
        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter Admin Password"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          {passwordError && (
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              {passwordError}
            </div>
          )}
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
