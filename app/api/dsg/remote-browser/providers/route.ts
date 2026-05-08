import { NextResponse } from 'next/server';
import { listRemoteBrowserProviders } from '@/lib/dsg/remote-browser/provider-registry';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      providers: listRemoteBrowserProviders(),
      truthBoundary: 'Providers are env-gated. A provider with env present remains adapter_pending until a verified executor adapter is implemented.',
    },
  });
}
