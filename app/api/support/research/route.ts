import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface ResearchRequest {
  query: string;
  limit?: number;
}

interface ResearchResult {
  source: string;
  title: string;
  content: string;
  relevance: number; // 0-100
  url?: string;
  category?: string;
}

// Mock knowledge base - in production would query real KB/docs
const KNOWLEDGE_BASE = [
  {
    id: 'kb-001',
    title: 'How to integrate the API',
    category: 'Integration',
    content: 'To integrate with our API, follow these steps: 1. Get your API key... 2. Use the REST endpoints... 3. Test with curl or Postman...',
    keywords: ['api', 'integration', 'rest', 'authentication', 'key'],
    url: '/docs/integration',
  },
  {
    id: 'kb-002',
    title: 'Troubleshooting common errors',
    category: 'Troubleshooting',
    content: 'Common errors and solutions: 401 Unauthorized - check your API key... 429 Rate Limited - implement exponential backoff... 500 Server Error - retry with exponential backoff...',
    keywords: ['error', '401', '429', '500', 'troubleshooting', 'solution'],
    url: '/docs/troubleshooting',
  },
  {
    id: 'kb-003',
    title: 'Pricing and billing FAQ',
    category: 'Billing',
    content: 'Free tier includes 1000 API calls/month. Pro tier $50/month includes 100k calls. Enterprise custom pricing available. Upgrade anytime with no penalty.',
    keywords: ['pricing', 'billing', 'cost', 'plan', 'free', 'pro', 'enterprise'],
    url: '/docs/billing',
  },
  {
    id: 'kb-004',
    title: 'Security best practices',
    category: 'Security',
    content: 'Keep API keys secret. Rotate keys regularly. Use HTTPS only. Enable 2FA on account. Report security issues responsibly.',
    keywords: ['security', 'api key', 'https', '2fa', 'authentication', 'encryption'],
    url: '/docs/security',
  },
  {
    id: 'kb-005',
    title: 'Rate limiting and quotas',
    category: 'Usage',
    content: 'API rate limit: 100 requests per minute. Monthly quota depends on plan. Get notified before reaching limits. Upgrade to increase limits.',
    keywords: ['rate limit', 'quota', 'throttle', 'requests', 'limit', 'exceeded'],
    url: '/docs/rate-limiting',
  },
];

function calculateRelevance(query: string, content: string, keywords: string[]): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  // Exact phrase match (highest relevance)
  if (content.toLowerCase().includes(lowerQuery)) {
    score += 40;
  }

  // Keyword matches
  const queryWords = lowerQuery.split(/\s+/);
  const matchedKeywords = keywords.filter((kw) =>
    queryWords.some((word) => kw.includes(word) || word.includes(kw))
  );
  score += matchedKeywords.length * 15;

  // Content length bonus (more detailed content is generally better)
  score += Math.min(content.length / 100, 20);

  return Math.min(Math.max(score, 0), 100);
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

    if (limit < 1 || limit > 20) {
      return NextResponse.json({ error: 'limit must be between 1 and 20' }, { status: 400 });
    }

    // Search knowledge base
    const results: ResearchResult[] = KNOWLEDGE_BASE
      .map((article) => ({
        source: 'Knowledge Base',
        title: article.title,
        content: article.content,
        relevance: calculateRelevance(query, article.content, article.keywords),
        url: article.url,
        category: article.category,
      }))
      .filter((r) => r.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    // TODO: In production, also search:
    // - Recent resolved tickets in org
    // - FAQ entries
    // - API documentation
    // - Customer success guides
    // - Common issues from support tickets

    return NextResponse.json({
      query,
      results_found: results.length,
      results,
      confidence: results.length > 0 ? results[0].relevance / 100 : 0,
      summary: results.length > 0
        ? `Found ${results.length} relevant articles. Top result: "${results[0].title}" (${Math.round(results[0].relevance)}% relevant)`
        : 'No relevant articles found. Consider creating a new support ticket.',
    });
  } catch (error) {
    return handleApiError(error, 'Failed to search knowledge base');
  }
}
