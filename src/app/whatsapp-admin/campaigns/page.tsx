'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import CampaignsPageContent from '@/modules/whatsapp-admin/components/CampaignsPageContent';

export default function CampaignsPage() {
  return (
    <WhatsAppAdminProvider>
      <CampaignsPageContentWrapper />
    </WhatsAppAdminProvider>
  );
}

function CampaignsPageContentWrapper() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <CampaignsPageContent />;
}
