import CampaignDetailClient from './CampaignDetailClient';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return <CampaignDetailClient campaignId={params.id} />;
}
