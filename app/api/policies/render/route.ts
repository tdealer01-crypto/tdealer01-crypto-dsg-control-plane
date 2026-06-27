import { NextRequest, NextResponse } from 'next/server';
import Markdoc from '@markdoc/markdoc';
import config from '@/markdoc.config';

export const dynamic = 'force-dynamic';

/**
 * POST /api/policies/render
 *
 * Renders a Markdoc policy markdown to HTML
 *
 * Body:
 * {
 *   markdown: string,
 *   policyId?: string,
 *   variables?: Record<string, any>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { markdown, policyId, variables = {} } = await request.json();

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json(
        { error: 'markdown is required and must be a string' },
        { status: 400 }
      );
    }

    // Parse and transform Markdoc
    const ast = Markdoc.parse(markdown);
    const transformed = Markdoc.transform(ast, {
      config,
      variables: {
        ...variables,
        policyId,
      },
    });

    // Convert to JSON (for HTML rendering on client)
    const content = JSON.stringify(transformed);

    return NextResponse.json({
      success: true,
      policyId,
      content,
      ast: ast.children.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Policy render error:', error);
    return NextResponse.json(
      { error: 'Render failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/policies/render?markdown=...&policyId=...
 *
 * Simple GET endpoint for testing
 */
export async function GET(request: NextRequest) {
  const markdown = request.nextUrl.searchParams.get('markdown');
  const policyId = request.nextUrl.searchParams.get('policyId');

  if (!markdown) {
    return NextResponse.json(
      { error: 'markdown query parameter is required' },
      { status: 400 }
    );
  }

  // Use POST handler logic
  return POST(
    new NextRequest(request.nextUrl, {
      method: 'POST',
      body: JSON.stringify({ markdown, policyId }),
    })
  );
}
