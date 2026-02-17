'use client';

import { useState, useEffect, FormEvent } from 'react';

export type StatusType = 'idle' | 'success' | 'error';
export type MessageType = 'single' | 'bulk';

export interface LogItem {
  to: string;
  subject: string;
  status: 'success' | 'failed';
  timestamp: string;
  error?: string;
}

export function useEmailAdmin() {
  // Auth state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Email state
  const [messageType, setMessageType] = useState<MessageType>('single');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [messageLog, setMessageLog] = useState<LogItem[]>([]);

  // Bulk email state
  const [bulkEmails, setBulkEmails] = useState('');
  const [importedEmails, setImportedEmails] = useState<string[]>([]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/email-admin-auth/check');
        const data = await response.json();
        setIsUnlocked(data.authenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsUnlocked(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Handle password unlock
  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    try {
      const response = await fetch('/api/email-admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await response.json();

      if (data.success) {
        setIsUnlocked(true);
        setPasswordInput('');
      } else {
        setPasswordError(data.error || 'Invalid password');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setPasswordError('Login failed. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/email-admin-auth/logout', { method: 'POST' });
      setIsUnlocked(false);
      setPasswordInput('');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle single email send
  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!to.trim() || !subject.trim() || !message.trim()) {
      setStatusMessage('Please fill in all fields');
      setStatusType('error');
      return;
    }

    setSending(true);
    setStatusMessage('Sending email...');
    setStatusType('idle');

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatusMessage(`✅ Email sent successfully to ${to}`);
        setStatusType('success');
        
        // Add to log
        setMessageLog(prev => [{
          to,
          subject,
          status: 'success',
          timestamp: new Date().toLocaleString(),
        }, ...prev]);

        // Clear form
        setTo('');
        setSubject('');
        setMessage('');
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      setStatusMessage(`❌ Error: ${error.message}`);
      setStatusType('error');
      
      // Add to log
      setMessageLog(prev => [{
        to,
        subject,
        status: 'failed',
        timestamp: new Date().toLocaleString(),
        error: error.message,
      }, ...prev]);
    } finally {
      setSending(false);
    }
  };

  // Handle bulk email send
  const handleSendBulkEmail = async (e: FormEvent) => {
    e.preventDefault();

    const emailList = [
      ...importedEmails,
      ...bulkEmails.split('\n').map(email => email.trim()).filter(Boolean),
    ];

    const uniqueEmails = [...new Set(emailList)];

    if (uniqueEmails.length === 0) {
      setStatusMessage('Please provide at least one email address');
      setStatusType('error');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setStatusMessage('Please fill in subject and message');
      setStatusType('error');
      return;
    }

    setSending(true);
    setStatusMessage(`Sending emails to ${uniqueEmails.length} recipients...`);
    setStatusType('idle');

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: uniqueEmails,
          subject,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const successCount = data.results.filter((r: any) => r.success).length;
        const failCount = data.results.length - successCount;

        setStatusMessage(
          `✅ Bulk send complete! Success: ${successCount}, Failed: ${failCount}`
        );
        setStatusType('success');

        // Add to log
        data.results.forEach((result: any, index: number) => {
          setMessageLog(prev => [{
            to: uniqueEmails[index],
            subject,
            status: result.success ? 'success' : 'failed',
            timestamp: new Date().toLocaleString(),
            error: result.error,
          }, ...prev]);
        });

        // Clear form
        setBulkEmails('');
        setImportedEmails([]);
        setSubject('');
        setMessage('');
      } else {
        throw new Error(data.error || 'Failed to send bulk emails');
      }
    } catch (error: any) {
      setStatusMessage(`❌ Error: ${error.message}`);
      setStatusType('error');
    } finally {
      setSending(false);
    }
  };

  // Handle file upload (CSV/Excel)
  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const emails: string[] = [];

      for (const line of lines) {
        const parts = line.split(',');
        for (const part of parts) {
          const trimmed = part.trim();
          // Basic email validation
          if (trimmed.includes('@') && trimmed.includes('.')) {
            emails.push(trimmed);
          }
        }
      }

      setImportedEmails(emails);
      setStatusMessage(`✅ Imported ${emails.length} email addresses from file`);
      setStatusType('success');

      // Clear after 3 seconds
      setTimeout(() => {
        if (statusMessage.includes('Imported')) {
          setStatusMessage('');
          setStatusType('idle');
        }
      }, 3000);
    } catch (error: any) {
      setStatusMessage(`❌ Failed to read file: ${error.message}`);
      setStatusType('error');
    }
  };

  return {
    // Auth
    isUnlocked,
    isCheckingAuth,
    passwordInput,
    setPasswordInput,
    passwordError,
    handleUnlock,
    handleLogout,
    
    // Email
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
    messageLog,
    bulkEmails,
    setBulkEmails,
    handleSendBulkEmail,
    handleFileUpload,
    importedEmails,
  };
}
