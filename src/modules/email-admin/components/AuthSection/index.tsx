'use client';
import { useEmailAdminContext } from '../../context/EmailAdminProvider';

export default function AuthSection() {
  const {
    passwordInput,
    setPasswordInput,
    passwordError,
    handleUnlock,
  } = useEmailAdminContext();

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

        <form onSubmit={handleUnlock}>
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
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                outline: 'none',
              }}
              autoFocus
            />
            {passwordError && (
              <p style={{
                marginTop: '8px',
                fontSize: '14px',
                color: '#dc2626',
              }}>
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            Unlock Admin Panel
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
