'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import CampaignDetailPageContent from '@/modules/whatsapp-admin/components/CampaignDetailPageContent';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <WhatsAppAdminProvider>
      <CampaignDetailPageContentWrapper campaignId={params.id} />
    </WhatsAppAdminProvider>
  );
}

function CampaignDetailPageContentWrapper({ campaignId }: { campaignId: string }) {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <CampaignDetailPageContent campaignId={campaignId} />;
}
