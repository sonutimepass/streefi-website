'use client';

export default function LoadingSection() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
      }}>
        <div style={{
          display: 'inline-block',
          width: '50px',
          height: '50px',
          border: '5px solid #e5e7eb',
          borderTop: '5px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{
          marginTop: '20px',
          fontSize: '16px',
          color: '#6b7280',
        }}>
          Loading...
        </p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
