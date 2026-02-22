'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import type { StatusType, MessageType, LogItem } from '../hooks/useEmailAdmin';

// Auth-specific context type
interface EmailAdminAuthContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Email functionality context type (extended from auth)
interface EmailAdminContextType extends EmailAdminAuthContextType {
  // Email state
  messageType: MessageType;
  setMessageType: (type: MessageType) => void;
  to: string;
  setTo: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  sending: boolean;
  statusMessage: string;
  statusType: StatusType;
  handleSendEmail: (e: React.FormEvent) => Promise<void>;
  messageLog: LogItem[];
  bulkEmails: string;
  setBulkEmails: (value: string) => void;
  handleSendBulkEmail: (e: React.FormEvent) => Promise<void>;
  handleFileUpload: (file: File) => Promise<void>;
  importedEmails: string[];
}

// Create the context
const EmailAdminContext = createContext<EmailAdminContextType | undefined>(undefined);

// Provider component
export function EmailAdminProvider({ children }: { children: ReactNode }) {
  // ============ AUTH STATE ============
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============ EMAIL STATE ============
  const [messageType, setMessageType] = useState<MessageType>('single');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [messageLog, setMessageLog] = useState<LogItem[]>([]);
  const [bulkEmails, setBulkEmails] = useState('');
  const [importedEmails, setImportedEmails] = useState<string[]>([]);

  // ============ AUTH FUNCTIONS ============
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/email-admin-auth/check', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Auth check failed: ${response.status}`);
        }

        const data = await response.json();
        setIsAuthenticated(data.authenticated === true);
        setError(null);
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
        setError('Failed to verify authentication status');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!password || password.trim().length === 0) {
      setError('Password is required');
      return { success: false, error: 'Password is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email-admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setError(null);
        return { success: true };
      } else {
        const errorMsg = data.error || 'Invalid password';
        setError(errorMsg);
        setIsAuthenticated(false);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMsg);
      setIsAuthenticated(false);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/email-admin-auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      setIsAuthenticated(false);
      setError(null);
      
      // Clear email form data on logout
      setTo('');
      setSubject('');
      setMessage('');
      setBulkEmails('');
      setImportedEmails([]);
      setStatusMessage('');
      setStatusType('idle');
    } catch (err) {
      console.error('Logout error:', err);
      // Even if logout API fails, clear local state
      setIsAuthenticated(false);
      setError('Logout request failed, but session cleared locally');
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============ EMAIL FUNCTIONS ============
  
  // Handle single email send
  const handleSendEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setStatusMessage('You must be logged in to send emails');
      setStatusType('error');
      return;
    }

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
        credentials: 'include',
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
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setStatusMessage(`❌ Error: ${errorMsg}`);
      setStatusType('error');
      
      // Add to log
      setMessageLog(prev => [{
        to,
        subject,
        status: 'failed',
        timestamp: new Date().toLocaleString(),
        error: errorMsg,
      }, ...prev]);
    } finally {
      setSending(false);
    }
  }, [isAuthenticated, to, subject, message]);

  // Handle bulk email send
  const handleSendBulkEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setStatusMessage('You must be logged in to send emails');
      setStatusType('error');
      return;
    }

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
        credentials: 'include',
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
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setStatusMessage(`❌ Error: ${errorMsg}`);
      setStatusType('error');
    } finally {
      setSending(false);
    }
  }, [isAuthenticated, importedEmails, bulkEmails, subject, message]);

  // Handle file upload (CSV/Excel)
  const handleFileUpload = useCallback(async (file: File) => {
    if (!isAuthenticated) {
      setStatusMessage('You must be logged in to upload files');
      setStatusType('error');
      return;
    }

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

      if (emails.length === 0) {
        throw new Error('No valid email addresses found in file');
      }

      setImportedEmails(emails);
      setStatusMessage(`✅ Imported ${emails.length} email addresses from file`);
      setStatusType('success');

      // Clear after 3 seconds
      setTimeout(() => {
        setStatusMessage('');
        setStatusType('idle');
      }, 3000);
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to read file';
      setStatusMessage(`❌ ${errorMsg}`);
      setStatusType('error');
    }
  }, [isAuthenticated]);

  // ============ CONTEXT VALUE ============
  const value: EmailAdminContextType = {
    // Auth
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
    
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

  return (
    <EmailAdminContext.Provider value={value}>
      {children}
    </EmailAdminContext.Provider>
  );
}

// Custom hook to use the context
export function useEmailAdminContext() {
  const context = useContext(EmailAdminContext);
  
  if (context === undefined) {
    throw new Error('useEmailAdminContext must be used within EmailAdminProvider');
  }
  
  return context;
}
