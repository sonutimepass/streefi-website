import React from 'react';
import { 
  AuthSection, 
  DashboardLayout, 
  LoadingSection,
  EmailAdminProvider,
  useEmailAdminContext
} from '@/modules/email-admin';

function EmailAdminContentInner() {
  const { isAuthenticated, isLoading } = useEmailAdminContext();

  if (isLoading) return <LoadingSection />;

  if (!isAuthenticated) return <AuthSection />;

  return <DashboardLayout />;
}

const EmailAdminContent = () => {
  return (
    <EmailAdminProvider>
      <EmailAdminContentInner />
    </EmailAdminProvider>
  );
};

export default EmailAdminContent;