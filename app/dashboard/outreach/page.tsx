// Outreach is no longer a standalone page — it lives as a system under the
// Agents tab (/dashboard/agents?tab=outreach). This route stays only to keep
// old links/bookmarks working.
import { redirect } from 'next/navigation';

export default function OutreachRedirect() {
  redirect('/dashboard/agents?tab=outreach');
}
