import { buildHealthReport } from '../../../lib/health/report';
import { handleApiError } from '../../../lib/security/api-error';

export async function GET() {
  try {
    const { payload, status } = await buildHealthReport();
    return Response.json(payload, {
      status,
      headers: {
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    return handleApiError('api/health', error);
  }
}
