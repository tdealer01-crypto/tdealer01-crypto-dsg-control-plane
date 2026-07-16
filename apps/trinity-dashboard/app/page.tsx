import SuperDashboard from '@/components/super-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Trinity Agent Dashboard',
  description: 'Real-time orchestration control plane for DSG Agent OS',
}

export default function Home() {
  return <SuperDashboard />
}
