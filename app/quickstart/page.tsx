import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function QuickstartRedirectPage() {
  redirect('/docs#dsg-one-runtime-flow');
}
