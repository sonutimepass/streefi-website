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

  if (isLoading) {
    return <LoadingSection />;
  }

  if (!isAuthenticated) {
    return <AuthSection />;
  }

  return <EmailFormSection />;
}

export default function EmailAdminClient() {
  return (
    <EmailAdminProvider>
      <EmailAdminContent />
    </EmailAdminProvider>
  );
}
