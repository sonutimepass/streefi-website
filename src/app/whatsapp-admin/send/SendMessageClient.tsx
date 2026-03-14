'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import SendMessagePageContent from '@/modules/whatsapp-admin/components/SendMessagePageContent';

function SendMessagePageContentWrapper() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <SendMessagePageContent />;
}

export default function SendMessageClient() {
  return (
    <WhatsAppAdminProvider>
      <SendMessagePageContentWrapper />
    </WhatsAppAdminProvider>
  );
}
