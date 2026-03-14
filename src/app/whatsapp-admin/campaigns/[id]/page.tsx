import CampaignDetailClient from './CampaignDetailClient';

export default function Page({ params }: { params: { id: string } }) {
  return <CampaignDetailClient campaignId={params.id} />;
}
