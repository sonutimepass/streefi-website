'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useWhatsAppAdmin } from '../hooks/useWhatsAppAdmin';
import type { StatusType, MessageType, LogItem } from '../hooks/useWhatsAppAdmin';

// Define the context type
interface WhatsAppAdminContextType {
  // Auth state
  isUnlocked: boolean;
  isCheckingAuth: boolean;
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  passwordError: string;
  handleUnlock: (e: React.FormEvent) => void;
  handleLogout: () => void;
  
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
  handleSendWhatsApp: (e: React.FormEvent) => void;
  messageLog: LogItem[];
  bulkPhones: string;
  setBulkPhones: (value: string) => void;
  handleSendBulkWhatsApp: (e: React.FormEvent) => void;
  handleFileUpload: (file: File) => void;
  importedPhones: string[];
}

// Create the context
const WhatsAppAdminContext = createContext<WhatsAppAdminContextType | undefined>(undefined);

// Provider component
export function WhatsAppAdminProvider({ children }: { children: ReactNode }) {
  const adminState = useWhatsAppAdmin();

  return (
    <WhatsAppAdminContext.Provider value={adminState}>
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
