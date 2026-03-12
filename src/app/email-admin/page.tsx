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

  if (!isClient) {
    return <LoadingSection />;
  }

  return (
    <EmailAdminProvider>
      <EmailAdminContent />
    </EmailAdminProvider>
  );
}
