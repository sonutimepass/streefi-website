'use client';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';

export default function MessageFormSection() {
  const {
    messageType,
    setMessageType,
    phone,
    setPhone,
    message,
    setMessage,
    templateName,
    setTemplateName,
    templateLanguage,
    setTemplateLanguage,
    templateParams,
    setTemplateParams,
    sending,
    statusMessage,
    statusType,
    handleSendWhatsApp,
    logout,
    messageLog,
    bulkPhones,
    setBulkPhones,
    handleSendBulkWhatsApp,
    handleFileUpload,
    importedPhones,
  } = useWhatsAppAdminContext();
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
        maxWidth: '600px',
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
          Send WhatsApp Message
        </h1>
        
        {/* Bulk WhatsApp Sender */}
        <div style={{
          backgroundColor: '#f0f9ff',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
            Bulk WhatsApp Sender
          </h2>

          <form onSubmit={handleSendBulkWhatsApp}>
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
                  color: '#0ea5e9',
                  backgroundColor: 'white',
                  border: '2px solid #0ea5e9',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '12px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#0ea5e9';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#0ea5e9';
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

              {importedPhones.length > 0 && (
                <div style={{ fontSize: '14px', marginBottom: '8px', color: '#059669', fontWeight: '500' }}>
                  ✅ Imported {importedPhones.length} numbers from file
                </div>
              )}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Paste Phone Numbers (one per line)
              </label>
              <textarea
                value={bulkPhones}
                onChange={(e) => setBulkPhones(e.target.value)}
                placeholder={`91XXXXXXXX01\n91XXXXXXXX02\n91XXXXXXXX03`}
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                Message for All
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              style={{
                width: '100%',
                padding: '10px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: sending ? '#9ca3af' : '#0ea5e9',
                border: 'none',
                borderRadius: '6px',
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Sending in bulk...' : 'Send to All'}
            </button>
          </form>
        </div>
        
        <form onSubmit={handleSendWhatsApp}>
          {/* Message Type Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              Message Type
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setMessageType('template')}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: messageType === 'template' ? 'white' : '#10b981',
                  backgroundColor: messageType === 'template' ? '#10b981' : 'white',
                  border: `2px solid #10b981`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Template Message
              </button>
              <button
                type="button"
                onClick={() => setMessageType('text')}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: messageType === 'text' ? 'white' : '#10b981',
                  backgroundColor: messageType === 'text' ? '#10b981' : 'white',
                  border: `2px solid #10b981`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Text Message
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="91XXXXXXXXXX"
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
          
          {messageType === 'template' ? (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., hello_world"
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  Language Code
                </label>
                <input
                  type="text"
                  value={templateLanguage}
                  onChange={(e) => setTemplateLanguage(e.target.value)}
                  placeholder="en, hi, etc."
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  Template Parameters (Optional)
                </label>
                {templateParams.map((param, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={param}
                      onChange={(e) => {
                        const newParams = [...templateParams];
                        newParams[index] = e.target.value;
                        setTemplateParams(newParams);
                      }}
                      placeholder={`Parameter ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '10px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                    {index === templateParams.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setTemplateParams([...templateParams, ''])}
                        style={{
                          padding: '10px 16px',
                          fontSize: '14px',
                          color: '#10b981',
                          backgroundColor: 'white',
                          border: '1px solid #10b981',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const newParams = templateParams.filter((_, i) => i !== index);
                          setTemplateParams(newParams);
                        }}
                        style={{
                          padding: '10px 16px',
                          fontSize: '14px',
                          color: '#dc2626',
                          backgroundColor: 'white',
                          border: '1px solid #dc2626',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          )}
          
          {statusMessage && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              borderRadius: '4px',
              backgroundColor: statusType === 'success' ? '#d1fae5' : '#fee2e2',
              color: statusType === 'success' ? '#065f46' : '#991b1b',
              fontSize: '14px',
            }}>
              {statusMessage}
            </div>
          )}

          {messageLog.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>
                Message History
              </h3>

              <div style={{ 
                maxHeight: '250px', 
                overflowY: 'auto', 
                border: '1px solid #ddd', 
                borderRadius: '6px',
                backgroundColor: '#fafafa',
              }}>
                {messageLog.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      borderBottom: index < messageLog.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '14px',
                      backgroundColor:
                        log.status === 'sent'
                          ? '#f0fdf4'
                          : log.status === 'failed'
                          ? '#fef2f2'
                          : '#f3f4f6',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#374151' }}>
                      {log.time} — {log.phone}
                    </div>
                    <div style={{ marginTop: '4px', color: '#6b7280' }}>{log.message}</div>
                    <div style={{ 
                      marginTop: '4px', 
                      fontWeight: '600',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: log.status === 'sent' ? '#059669' : log.status === 'failed' ? '#dc2626' : '#9ca3af'
                    }}>
                      Status: {log.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            flexDirection: 'column',
          }}>
            <button
              type="submit"
              disabled={sending}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: sending ? '#9ca3af' : '#10b981',
                border: 'none',
                borderRadius: '4px',
                cursor: sending ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (!sending) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseOut={(e) => {
                if (!sending) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              {sending ? 'Sending...' : 'Send WhatsApp'}
            </button>

            <button
              type="button"
              onClick={() => {
                setPhone('');
                setMessage('');
                setTemplateName('');
                setTemplateParams(['']);
              }}
              disabled={sending}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: sending ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (!sending) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseOut={(e) => {
                if (!sending) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


