'use client';

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

export default function EmailAdminClient() {
  return (
    <EmailAdminProvider>
      <EmailAdminContent />
    </EmailAdminProvider>
  );
}
