'use client';
import { useState } from 'react';
import { useEmailAdminContext } from '../../context/EmailAdminProvider';

export default function AuthSection() {
  const { login, error, clearError, isLoading } = useEmailAdminContext();
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
      padding: '20px',
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
          📧 Email Admin Login
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '500',
              fontSize: '14px',
            }}>
              Admin Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                outline: 'none',
                opacity: isLoading ? 0.6 : 1,
              }}
              autoFocus
            />
            {error && (
              <p style={{
                marginTop: '8px',
                fontSize: '14px',
                color: '#dc2626',
              }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !passwordInput.trim()}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: (isLoading || !passwordInput.trim()) ? '#9ca3af' : '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              cursor: (isLoading || !passwordInput.trim()) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              if (!isLoading && passwordInput.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && passwordInput.trim()) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isLoading ? 'Authenticating...' : 'Unlock Admin Panel'}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
        }}>
          Secure access for Streefi email management
        </p>
      </div>
    </div>
  );
}
