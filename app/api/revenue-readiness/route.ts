/**
 * GET /api/revenue-readiness
 *
 * Public probe. Reports whether the revenue loop can turn a governed
 * execution into a billable Stripe meter event, and names the exact blocker
 * when it cannot.
 *
 * Env vars are reported by name with a boolean only — no values are read into
 * the response, and the DB figures are aggregate counts with no customer rows.
 */
import { getRevenueReadiness } from '../../../lib/billing/revenue-readiness';
import { handleApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await getRevenueReadiness();
    return Response.json(report, {
      status: report.ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError('api/revenue-readiness', error);
  }
}
