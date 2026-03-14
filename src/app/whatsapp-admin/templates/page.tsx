'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import TemplatesPageContent from '@/modules/whatsapp-admin/components/TemplatesPageContent';

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  return (
    <WhatsAppAdminProvider>
      <TemplatesPageContentWrapper />
    </WhatsAppAdminProvider>
  );
}

function TemplatesPageContentWrapper() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <TemplatesPageContent />;
}
