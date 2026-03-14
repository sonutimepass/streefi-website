'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import TemplatesPageContent from '@/modules/whatsapp-admin/components/TemplatesPageContent';

function TemplatesPageContentWrapper() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <TemplatesPageContent />;
}

export default function TemplatesClient() {
  return (
    <WhatsAppAdminProvider>
      <TemplatesPageContentWrapper />
    </WhatsAppAdminProvider>
  );
}
