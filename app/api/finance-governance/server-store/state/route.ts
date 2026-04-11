import { blockedServerStoreResponse } from '../../../../../lib/finance-governance/server-store-deprecated';

export const dynamic = 'force-dynamic';

export async function GET() {
  return blockedServerStoreResponse();
}
