import { NextResponse } from 'next/server';

const MESSAGE = 'finance_governance_server_store_removed_use_scoped_endpoints';

export function blockedServerStoreResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: MESSAGE,
      deprecated: true,
      replacement: '/api/finance-governance/*',
    },
    {
      status: 410,
      headers: {
        'X-Deprecated': 'true',
        'X-Replacement-Endpoint': '/api/finance-governance/*',
      },
    }
  );
}
