import { useState, useEffect } from 'react';

export type StatusType = 'success' | 'error' | '';

export const useWhatsAppAdmin = () => {
  // Authentication state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Form state
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('');

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/whatsapp-admin-auth', {
          method: 'GET',
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.authenticated) {
          setIsUnlocked(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);

  // Handle password unlock via API
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!passwordInput) {
      setPasswordError('Password is required');
      return;
    }
    
    try {
      const response = await fetch('/api/whatsapp-admin-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password: passwordInput }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsUnlocked(true);
        setPasswordError('');
        setPasswordInput('');
      } else {
        setPasswordError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setPasswordError('Network error. Please try again.');
      console.error('Unlock error:', error);
    }
  };

  // Handle WhatsApp message sending
  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !message) {
      setStatusMessage('Please fill in both phone and message');
      setStatusType('error');
      return;
    }

    setSending(true);
    setStatusMessage('');
    setStatusType('');

    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatusMessage('Message sent!');
        setStatusType('success');
        setPhone('');
        setMessage('');
      } else {
        setStatusMessage(data.error || 'Failed to send message');
        setStatusType('error');
      }
    } catch (error) {
      setStatusMessage('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStatusType('error');
    } finally {
      setSending(false);
    }
  };

  return {
    // Auth state
    isUnlocked,
    isCheckingAuth,
    passwordInput,
    setPasswordInput,
    passwordError,
    handleUnlock,
    
    // Form state
    phone,
    setPhone,
    message,
    setMessage,
    sending,
    statusMessage,
    statusType,
    handleSendWhatsApp,
  };
};
