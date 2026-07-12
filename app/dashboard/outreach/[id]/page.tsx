// Deep links to a campaign now open the Outreach system inside the Agents tab.
import { redirect } from 'next/navigation';

export default async function OutreachCampaignRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/agents?tab=outreach&campaign=${encodeURIComponent(id)}`);
}
