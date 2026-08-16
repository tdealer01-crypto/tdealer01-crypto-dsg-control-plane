import ReceiptClient from './ReceiptClient';

export const dynamic = 'force-dynamic';

export default async function ReceiptPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <ReceiptClient runId={runId} />;
}
