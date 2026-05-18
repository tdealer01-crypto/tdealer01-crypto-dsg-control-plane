import { getDeploymentReadiness } from '../../../lib/deployment/readiness';
import { handleApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const readiness = await getDeploymentReadiness();
    return Response.json(readiness, { status: readiness.ok ? 200 : 503 });
  } catch (error) {
    return handleApiError('api/readiness', error);
  }
}
