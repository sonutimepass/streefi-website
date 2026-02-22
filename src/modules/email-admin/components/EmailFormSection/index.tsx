'use client';
import { useEmailAdminContext } from '../../context/EmailAdminProvider';

export default function EmailFormSection() {
  const {
    messageType,
    setMessageType,
    to,
    setTo,
    subject,
    setSubject,
    message,
    setMessage,
    sending,
    statusMessage,
    statusType,
    handleSendEmail,
    logout,
    messageLog,
    bulkEmails,
    setBulkEmails,
    handleSendBulkEmail,
    handleFileUpload,
    importedEmails,
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
        maxWidth: '800px',
        position: 'relative',
      }}>
        {/* Logout Button */}
        <button
          onClick={logout}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#dc2626',
            backgroundColor: 'transparent',
            border: '1px solid #dc2626',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#dc2626';
          }}
        >
          Logout
        </button>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          📧 Send Email via Zoho
        </h1>

        {/* Message Type Selector */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => setMessageType('single')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: messageType === 'single' ? 'white' : '#3b82f6',
              backgroundColor: messageType === 'single' ? '#3b82f6' : 'white',
              border: '2px solid #3b82f6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📨 Single Email
          </button>
          <button
            onClick={() => setMessageType('bulk')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: messageType === 'bulk' ? 'white' : '#8b5cf6',
              backgroundColor: messageType === 'bulk' ? '#8b5cf6' : 'white',
              border: '2px solid #8b5cf6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📬 Bulk Email
          </button>
        </div>

        {/* Single Email Form */}
        {messageType === 'single' && (
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
              Single Email Sender
            </h2>

            <form onSubmit={handleSendEmail}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  To Email Address
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your email message here..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: sending ? '#9ca3af' : '#3b82f6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!sending) e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  if (!sending) e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                {sending ? 'Sending...' : '📧 Send Email'}
              </button>
            </form>
          </div>
        )}

        {/* Bulk Email Form */}
        {messageType === 'bulk' && (
          <div style={{
            backgroundColor: '#faf5ff',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
              Bulk Email Sender
            </h2>

            <form onSubmit={handleSendBulkEmail}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Upload CSV/Excel File (Optional)
                </label>
                <label
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#8b5cf6',
                    backgroundColor: 'white',
                    border: '2px solid #8b5cf6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '12px',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#8b5cf6';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#8b5cf6';
                  }}
                >
                  📁 Choose CSV/Excel File
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                {importedEmails.length > 0 && (
                  <div style={{ fontSize: '14px', marginBottom: '8px', color: '#059669', fontWeight: '500' }}>
                    ✅ Imported {importedEmails.length} email addresses from file
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Paste Email Addresses (one per line)
                </label>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your email message here..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: sending ? '#9ca3af' : '#8b5cf6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!sending) e.currentTarget.style.backgroundColor = '#7c3aed';
                }}
                onMouseOut={(e) => {
                  if (!sending) e.currentTarget.style.backgroundColor = '#8b5cf6';
                }}
              >
                {sending ? 'Sending...' : '📬 Send Bulk Emails'}
              </button>
            </form>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div style={{
            padding: '12px',
            marginBottom: '24px',
            borderRadius: '6px',
            backgroundColor: statusType === 'success' ? '#d1fae5' : statusType === 'error' ? '#fee2e2' : '#e0e7ff',
            border: `1px solid ${statusType === 'success' ? '#10b981' : statusType === 'error' ? '#ef4444' : '#6366f1'}`,
          }}>
            <p style={{
              fontSize: '14px',
              color: statusType === 'success' ? '#065f46' : statusType === 'error' ? '#991b1b' : '#3730a3',
              fontWeight: '500',
            }}>
              {statusMessage}
            </p>
          </div>
        )}

        {/* Message Log */}
        {messageLog.length > 0 && (
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}>
              📊 Email Log
            </h3>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}>
              {messageLog.map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    borderBottom: index < messageLog.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: log.status === 'success' ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
                      {log.to}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: log.status === 'success' ? '#059669' : '#dc2626',
                      fontWeight: '600',
                    }}>
                      {log.status === 'success' ? '✅ Sent' : '❌ Failed'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                    <strong>Subject:</strong> {log.subject}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {log.timestamp}
                  </div>
                  {log.error && (
                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                      Error: {log.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
