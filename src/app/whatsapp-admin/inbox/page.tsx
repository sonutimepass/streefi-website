'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import InboxContent from '@/modules/whatsapp-admin/components/InboxContent';

export default function WhatsAppInboxPage() {
  return (
    <WhatsAppAdminProvider>
      <WhatsAppInboxPageContent />
    </WhatsAppAdminProvider>
  );
}

function WhatsAppInboxPageContent() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <InboxContent />;
}
