'use client';

import { 
  AuthSection, 
  EmailFormSection, 
  LoadingSection,
  EmailAdminProvider,
  useEmailAdminContext
} from '@/modules/email-admin';

export default function EmailAdminPage() {
  return (
    <EmailAdminProvider>
      <EmailAdminContent />
    </EmailAdminProvider>
  );
}

function EmailAdminContent() {
  const { isAuthenticated, isLoading } = useEmailAdminContext();

  if (isLoading) return <LoadingSection />;

  if (!isAuthenticated) return <AuthSection />;

  return <EmailFormSection />;
}
