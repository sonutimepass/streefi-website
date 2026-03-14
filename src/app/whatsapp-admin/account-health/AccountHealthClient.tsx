'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import AccountHealthContent from '@/modules/whatsapp-admin/components/AccountHealthContent';

function AccountHealthPageContent() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <AccountHealthContent />;
}

export default function AccountHealthClient() {
  return (
    <WhatsAppAdminProvider>
      <AccountHealthPageContent />
    </WhatsAppAdminProvider>
  );
}
