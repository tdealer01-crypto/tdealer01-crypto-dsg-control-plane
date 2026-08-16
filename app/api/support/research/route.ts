import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface ResearchRequest {
  query: string;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ResearchRequest = await request.json();
    const { query, limit = 5 } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      return NextResponse.json({ error: 'limit must be between 1 and 20' }, { status: 400 });
    }

    // There is currently no verified organization knowledge-base repository or
    // support-document search connector wired to this endpoint. Returning
    // invented documentation, pricing, quotas, or relevance scores would cross
    // the product truth boundary, so the feature is explicitly unavailable.
    return NextResponse.json(
      {
        ok: false,
        available: false,
        query: query.trim(),
        results_found: 0,
        results: [],
        error: 'support_knowledge_base_not_configured',
        next_action: 'Connect a verified support knowledge-base source before enabling research results.',
      },
      { status: 503 },
    );
  } catch (error) {
    return handleApiError(error, 'Failed to search knowledge base');
  }
}
