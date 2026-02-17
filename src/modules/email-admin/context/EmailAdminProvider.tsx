'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useEmailAdmin } from '../hooks/useEmailAdmin';
import type { StatusType, MessageType, LogItem } from '../hooks/useEmailAdmin';

// Define the context type
interface EmailAdminContextType {
  // Auth state
  isUnlocked: boolean;
  isCheckingAuth: boolean;
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  passwordError: string;
  handleUnlock: (e: React.FormEvent) => void;
  handleLogout: () => void;
  
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
  handleSendEmail: (e: React.FormEvent) => void;
  messageLog: LogItem[];
  bulkEmails: string;
  setBulkEmails: (value: string) => void;
  handleSendBulkEmail: (e: React.FormEvent) => void;
  handleFileUpload: (file: File) => void;
  importedEmails: string[];
}

// Create the context
const EmailAdminContext = createContext<EmailAdminContextType | undefined>(undefined);

// Provider component
export function EmailAdminProvider({ children }: { children: ReactNode }) {
  const adminState = useEmailAdmin();

  return (
    <EmailAdminContext.Provider value={adminState}>
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
