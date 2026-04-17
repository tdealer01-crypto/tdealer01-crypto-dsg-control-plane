import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function QuickstartRedirectPage() {
  // first-run must use the same production path as real-run
  // keep /quickstart only as a compatibility URL and send users to Auto-Setup
  redirect('/dashboard/skills?source=quickstart');
}
