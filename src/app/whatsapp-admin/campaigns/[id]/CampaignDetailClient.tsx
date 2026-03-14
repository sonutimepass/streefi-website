'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import CampaignDetailPageContent from '@/modules/whatsapp-admin/components/CampaignDetailPageContent';

function CampaignDetailPageContentWrapper({ campaignId }: { campaignId: string }) {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <CampaignDetailPageContent campaignId={campaignId} />;
}

export default function CampaignDetailClient({ campaignId }: { campaignId: string }) {
  return (
    <WhatsAppAdminProvider>
      <CampaignDetailPageContentWrapper campaignId={campaignId} />
    </WhatsAppAdminProvider>
  );
}
