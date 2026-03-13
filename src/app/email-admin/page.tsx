'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { 
  AuthSection, 
  DashboardLayout, 
  LoadingSection,
  EmailAdminProvider,
  useEmailAdminContext
} from '@/modules/email-admin';

// Create a separate inner component that uses the context
function EmailAdminContent() {
  const { isAuthenticated, isLoading } = useEmailAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;
  return <DashboardLayout />;
}

export default function EmailAdminPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // During SSR, render a simple loading state without any context
  if (!isClient) {
    return <LoadingSection />;
  }

  // On client-side, wrap everything with the provider
  return (
    <EmailAdminProvider>
      <EmailAdminContent />
    </EmailAdminProvider>
  );
}