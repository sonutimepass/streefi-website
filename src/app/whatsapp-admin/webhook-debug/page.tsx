'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext } from '@/modules/whatsapp-admin/context/WhatsAppAdminProvider';
import AuthSection from '@/modules/whatsapp-admin/components/AuthSection';
import LoadingSection from '@/modules/whatsapp-admin/components/LoadingSection';
import { WebhookDebugContent } from '@/modules/whatsapp-admin/components/WebhookDebugContent';

function WebhookDebugPageContent() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) {
    return <LoadingSection />;
  }

  if (!isAuthenticated) {
    return <AuthSection />;
  }

  return <WebhookDebugContent />;
}

export default function WebhookDebugPage() {
  return (
    <WhatsAppAdminProvider>
      <WebhookDebugPageContent />
    </WhatsAppAdminProvider>
  );
}
