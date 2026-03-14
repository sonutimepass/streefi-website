'use client'

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en-IN">
      <body>
        <div style={{
          minHeight: '100vh',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '32rem',
            width: '100%',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '2.25rem',
              fontWeight: 'bold',
              color: '#111',
              marginBottom: '1rem'
            }}>
              Something went wrong!
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: '#374151',
              marginBottom: '2rem'
            }}>
              Our team has been notified. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '1rem 2rem',
                background: '#06c167',
                color: 'white',
                border: 'none',
                borderRadius: '9999px',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Try Again!
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
