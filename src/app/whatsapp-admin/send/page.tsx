'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import SendMessagePageContent from '@/modules/whatsapp-admin/components/SendMessagePageContent';

export const dynamic = 'force-dynamic';

export default function SendMessagePage() {
  return (
    <WhatsAppAdminProvider>
      <SendMessagePageContentWrapper />
    </WhatsAppAdminProvider>
  );
}

function SendMessagePageContentWrapper() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <SendMessagePageContent />;
}
