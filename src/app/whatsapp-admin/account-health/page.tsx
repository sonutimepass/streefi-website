'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import AccountHealthContent from '@/modules/whatsapp-admin/components/AccountHealthContent';

export default function AccountHealthPage() {
  return (
    <WhatsAppAdminProvider>
      <AccountHealthPageContent />
    </WhatsAppAdminProvider>
  );
}

function AccountHealthPageContent() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <AccountHealthContent />;
}
