'use client';

import { 
  AuthSection, 
  EmailFormSection, 
  LoadingSection,
  EmailAdminProvider,
  useEmailAdminContext
} from '@/modules/email-admin';

function EmailAdminContent() {
  const { isUnlocked, isCheckingAuth } = useEmailAdminContext();

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return <LoadingSection />;
  }

  // Show login screen if not authenticated
  if (!isUnlocked) {
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
