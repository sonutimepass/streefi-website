'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import type { StatusType, MessageType, LogItem } from '../hooks/useWhatsAppAdmin';

// Auth-specific context type
interface WhatsAppAdminAuthContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// WhatsApp functionality context type (extended from auth)
interface WhatsAppAdminContextType extends WhatsAppAdminAuthContextType {
  // Message state
  messageType: MessageType;
  setMessageType: (type: MessageType) => void;
  phone: string;
  setPhone: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  templateName: string;
  setTemplateName: (value: string) => void;
  templateLanguage: string;
  setTemplateLanguage: (value: string) => void;
  templateParams: string[];
  setTemplateParams: (params: string[]) => void;
  sending: boolean;
  statusMessage: string;
  statusType: StatusType;
  handleSendWhatsApp: (e: React.FormEvent) => Promise<void>;
  messageLog: LogItem[];
  bulkPhones: string;
  setBulkPhones: (value: string) => void;
  handleSendBulkWhatsApp: (e: React.FormEvent) => Promise<void>;
  handleFileUpload: (file: File) => Promise<void>;
  importedPhones: string[];
}

// Create the context
const WhatsAppAdminContext = createContext<WhatsAppAdminContextType | undefined>(undefined);

// Provider component
export function WhatsAppAdminProvider({ children }: { children: ReactNode }) {
  // ============ AUTH STATE ============
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============ MESSAGE STATE ============
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

  // ============ AUTH FUNCTIONS ============
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/whatsapp-admin-auth/check', {
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
      const response = await fetch('/api/whatsapp-admin-auth/login', {
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
      await fetch('/api/whatsapp-admin-auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      setIsAuthenticated(false);
      setError(null);
      
      // Clear message form data on logout
      setPhone('');
      setMessage('');
      setTemplateName('');
      setTemplateParams(['']);
      setBulkPhones('');
      setImportedPhones([]);
      setStatusMessage('');
      setStatusType('');
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

  // ============ MESSAGE FUNCTIONS ============
  
  // Handle WhatsApp message sending
  const handleSendWhatsApp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setStatusMessage('You must be logged in to send messages');
      setStatusType('error');
      return;
    }
    
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

    setMessageLog(prev => [newLog, ...prev]);

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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
    } catch (err) {
      setMessageLog(prev =>
        prev.map(log =>
          log.time === timestamp
            ? { ...log, status: 'failed' }
            : log
        )
      );

      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setStatusMessage('Error: ' + errorMsg);
      setStatusType('error');
    } finally {
      setSending(false);
    }
  }, [isAuthenticated, phone, message, messageType, templateName, templateLanguage, templateParams]);

  // Handle bulk WhatsApp message sending
  const handleSendBulkWhatsApp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setStatusMessage('You must be logged in to send messages');
      setStatusType('error');
      return;
    }

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
          credentials: 'include',
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
  }, [isAuthenticated, bulkPhones, message]);

  // Handle file upload (CSV/Excel)
  const handleFileUpload = useCallback(async (file: File) => {
    if (!isAuthenticated) {
      setStatusMessage('You must be logged in to upload files');
      setStatusType('error');
      return;
    }

    try {
      // Dynamic import to reduce bundle size
      const XLSX = await import('xlsx');
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(firstSheet);

      const phones: string[] = [];

      rows.forEach((row: any) => {
        // Extract phone from common column names
        const phone = row.phone || row.Phone || row.mobile || row.Mobile || row.number || row.Number;
        
        if (phone) {
          const cleanPhone = String(phone).trim();
          if (cleanPhone.length >= 10) {
            phones.push(cleanPhone);
          }
        }
      });

      if (phones.length === 0) {
        throw new Error('No valid phone numbers found in file');
      }

      setImportedPhones(phones);
      setStatusMessage(`✅ Imported ${phones.length} phone numbers from file`);
      setStatusType('success');

      // Clear after 3 seconds
      setTimeout(() => {
        setStatusMessage('');
        setStatusType('');
      }, 3000);
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to read file';
      setStatusMessage(`❌ ${errorMsg}`);
      setStatusType('error');
    }
  }, [isAuthenticated]);

  // ============ CONTEXT VALUE ============
  const value: WhatsAppAdminContextType = {
    // Auth
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
    
    // Messages
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

  return (
    <WhatsAppAdminContext.Provider value={value}>
      {children}
    </WhatsAppAdminContext.Provider>
  );
}

// Custom hook to use the context
export function useWhatsAppAdminContext() {
  const context = useContext(WhatsAppAdminContext);
  
  if (context === undefined) {
    throw new Error('useWhatsAppAdminContext must be used within WhatsAppAdminProvider');
  }
  
  return context;
}
