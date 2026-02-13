import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export type StatusType = 'success' | 'error' | '';
export type MessageType = 'text' | 'template';

export type LogItem = {
  time: string;
  phone: string;
  message: string;
  status: 'sending' | 'sent' | 'failed';
};

export const useWhatsAppAdmin = () => {
  // Authentication state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Form state
  const [messageType, setMessageType] = useState<MessageType>('template');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [templateParams, setTemplateParams] = useState<string[]>(['']);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('');
  const [messageLog, setMessageLog] = useState<LogItem[]>([]);
  const [bulkPhones, setBulkPhones] = useState('');
  const [importedPhones, setImportedPhones] = useState<string[]>([]);

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
    
    if (!phone) {
      setStatusMessage('Phone number is required');
      setStatusType('error');
      return;
    }

    if (messageType === 'text' && !message) {
      setStatusMessage('Message text is required');
      setStatusType('error');
      return;
    }

    if (messageType === 'template' && !templateName) {
      setStatusMessage('Template name is required');
      setStatusType('error');
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const displayMessage = messageType === 'template' 
      ? `Template: ${templateName}` 
      : message;

    // Add to log as "sending" first
    const newLog: LogItem = {
      time: timestamp,
      phone,
      message: displayMessage,
      status: 'sending',
    };

    setMessageLog(prev => [newLog, ...prev]); // newest on top

    setSending(true);
    setStatusMessage('');
    setStatusType('');

    try {
      const payload: any = { phone };

      if (messageType === 'template') {
        payload.template = {
          name: templateName,
          language: templateLanguage,
          parameters: templateParams.filter(p => p.trim() !== ''),
        };
      } else {
        payload.message = message;
      }

      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      setMessageLog(prev =>
        prev.map(log =>
          log.time === timestamp
            ? {
                ...log,
                status: data.success ? 'sent' : 'failed',
              }
            : log
        )
      );

      if (data.success) {
        setStatusMessage(data.message || 'Message sent successfully!');
        setStatusType('success');
        setPhone('');
        setMessage('');
        setTemplateName('');
        setTemplateParams(['']);
      } else {
        setStatusMessage(data.error || 'Failed to send message');
        setStatusType('error');
      }
    } catch (error) {
      setMessageLog(prev =>
        prev.map(log =>
          log.time === timestamp
            ? { ...log, status: 'failed' }
            : log
        )
      );

      setStatusMessage('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStatusType('error');
    } finally {
      setSending(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear cookie
      await fetch('/api/whatsapp-admin-auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Reset local state regardless of API call result
      setIsUnlocked(false);
      setPasswordInput('');
      setPhone('');
      setMessage('');
      setTemplateName('');
      setTemplateParams(['']);
      setStatusMessage('');
      setStatusType('');
    }
  };

  // Handle bulk WhatsApp message sending
  const handleSendBulkWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkPhones || !message) {
      setStatusMessage('Please provide phone numbers and message');
      setStatusType('error');
      return;
    }

    // Convert textarea lines into array of phones
    const phoneList = bulkPhones
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length >= 10);

    if (phoneList.length === 0) {
      setStatusMessage('No valid phone numbers found');
      setStatusType('error');
      return;
    }

    setSending(true);
    setStatusMessage(`Sending to ${phoneList.length} numbers...`);
    setStatusType('');

    for (const phone of phoneList) {
      const timestamp = new Date().toLocaleTimeString();

      // Add to log as sending
      setMessageLog(prev => [
        {
          time: timestamp,
          phone,
          message,
          status: 'sending',
        },
        ...prev,
      ]);

      try {
        const response = await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message }),
        });

        const data = await response.json();

        setMessageLog(prev =>
          prev.map(log =>
            log.time === timestamp
              ? {
                  ...log,
                  status: data.success ? 'sent' : 'failed',
                }
              : log
          )
        );
      } catch {
        setMessageLog(prev =>
          prev.map(log =>
            log.time === timestamp
              ? { ...log, status: 'failed' }
              : log
          )
        );
      }
    }

    setSending(false);
    setStatusMessage(`Finished sending to ${phoneList.length} numbers`);
    setStatusType('success');
  };

  // Handle file upload (CSV/Excel)
  const handleFileUpload = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(firstSheet);

    const phones = rows
      .map((row: any) => {
        const key = Object.keys(row).find(k =>
          k.toLowerCase().includes('phone')
        );
        return key ? String(row[key]).replace(/\D/g, '') : '';
      })
      .filter((p: string) => p.length >= 10);

    setImportedPhones(phones);
    setBulkPhones(phones.join('\n'));
  };

  return {
    // Auth state
    isUnlocked,
    isCheckingAuth,
    passwordInput,
    setPasswordInput,
    passwordError,
    handleUnlock,
    handleLogout,
    
    // Form state
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
    messageLog,
    bulkPhones,
    setBulkPhones,
    handleSendBulkWhatsApp,
    handleFileUpload,
    importedPhones,
  };
};

