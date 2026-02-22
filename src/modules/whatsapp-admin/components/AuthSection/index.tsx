'use client';

import { useState } from 'react';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';

export default function AuthSection() {
  const { login, error, clearError, isLoading } = useWhatsAppAdminContext();
  const [passwordInput, setPasswordInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const result = await login(passwordInput);
    
    if (!result.success) {
      // Error is already set in context
      setPasswordInput(''); // Clear password on error
    } else {
      setPasswordInput(''); // Clear password on success
    }
  };
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
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter Admin Password"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
              }}
            />
          </div>
          
          {error && (
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !passwordInput.trim()}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: (isLoading || !passwordInput.trim()) ? '#9ca3af' : '#10b981',
              border: 'none',
              borderRadius: '4px',
              cursor: (isLoading || !passwordInput.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Authenticating...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
