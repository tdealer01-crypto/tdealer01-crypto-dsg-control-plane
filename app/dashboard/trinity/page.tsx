import dynamic from 'next/dynamic';

const SuperDashboard = dynamic(() => import('@/components/super-dashboard'), {
  ssr: false,
});

export const dynamic = 'force-dynamic';

export default function TrinityDashboard() {
  return <SuperDashboard />;
}
