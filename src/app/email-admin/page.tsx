'use client';

import { 
  AuthSection, 
  EmailFormSection, 
  LoadingSection,
  EmailAdminProvider,
  useEmailAdminContext
} from '@/modules/email-admin';

function EmailAdminContent() {
  const { isAuthenticated, isLoading } = useEmailAdminContext();

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingSection />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <AuthSection />;
  }

  // Show admin panel if authenticated
  return <EmailFormSection />;
}

export default function EmailAdminPage() {
  return (
    <EmailAdminProvider>
      <EmailAdminContent />
    </EmailAdminProvider>
  );
}