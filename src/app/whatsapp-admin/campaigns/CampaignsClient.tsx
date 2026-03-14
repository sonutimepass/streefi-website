'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import CampaignsPageContent from '@/modules/whatsapp-admin/components/CampaignsPageContent';

function CampaignsPageContentWrapper() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <CampaignsPageContent />;
}

export default function CampaignsClient() {
  return (
    <WhatsAppAdminProvider>
      <CampaignsPageContentWrapper />
    </WhatsAppAdminProvider>
  );
}
