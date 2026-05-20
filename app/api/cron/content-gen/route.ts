// Content Generation Cron — runs weekly on Monday at 6 AM UTC
// Generates 1 SEO article + 3 LinkedIn posts, emails to FOUNDER_EMAIL

import { NextResponse } from 'next/server';
import { executeTool } from '../../../../lib/marketing/mcp-tools';
import { getResend } from '../../../../lib/resend';
import { requireCronAuth } from '../../../../lib/security/cron-auth';

export const dynamic = 'force-dynamic';

// Rotate topics by ISO week number
const SEO_KEYWORDS = [
  'EU AI Act compliance for AI agents',
  'how to add human oversight to AI agents',
  'pre-execution AI agent control',
  'AI agent audit trail requirements',
  'EU AI Act Article 9 risk management AI systems',
  'EU AI Act Article 14 human oversight AI',
  'AI governance for fintech',
  'how to block AI agent actions before execution',
  'cryptographic audit trail AI agents',
  'ISO 42001 AI management system requirements',
  'AI agent compliance REST API',
  'AI agent governance tools comparison',
];

const LINKEDIN_ANGLES = [
  'eu-ai-act-enforcement',
  'prevention-vs-detection',
  'fintech-use-case',
  'audit-trail-explainer',
  'developer-story',
] as const;

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86_400_000 + start.getDay() + 1) / 7);
}

export async function GET(request: Request) {
  const auth = requireCronAuth(request, 'content-gen');
  if (!auth.ok) return auth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY not configured' }, { status: 200, headers: auth.headers });
  }

  const founderEmail = process.env.FOUNDER_EMAIL;
  if (!founderEmail) {
    return NextResponse.json({ ok: false, error: 'FOUNDER_EMAIL not set' }, { status: 200, headers: auth.headers });
  }

  const week = getWeekNumber();
  const keyword = SEO_KEYWORDS[week % SEO_KEYWORDS.length];
  const angles = [
    LINKEDIN_ANGLES[week % LINKEDIN_ANGLES.length],
    LINKEDIN_ANGLES[(week + 1) % LINKEDIN_ANGLES.length],
    LINKEDIN_ANGLES[(week + 2) % LINKEDIN_ANGLES.length],
  ];

  const errors: string[] = [];

  let article: Record<string, unknown> = {};
  try {
    article = await executeTool('generate_seo_article', { keyword });
  } catch {
    errors.push('article: failed');
  }

  const linkedinPosts: Array<{ angle: string; post: string }> = [];
  for (const angle of angles) {
    try {
      const result = await executeTool('generate_linkedin_post', { angle });
      linkedinPosts.push({ angle, post: String((result as Record<string, unknown>).post ?? '') });
    } catch {
      errors.push(`linkedin(${angle}): failed`);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
  const resend = getResend();

  if (resend.configured) {
    const articleSection = article.title
      ? `<h2>SEO Article — Week ${week}</h2>
         <p><strong>Keyword:</strong> ${keyword}</p>
         <p><strong>Title:</strong> ${article.title}</p>
         <p><strong>Meta:</strong> ${article.meta_description}</p>
         <hr/>
         <pre style="white-space:pre-wrap;font-size:13px;background:#f5f5f5;padding:16px;border-radius:8px">${String(article.body ?? '').slice(0, 3000)}</pre>`
      : '<p>Article generation failed.</p>';

    const postsSection = linkedinPosts
      .map(
        (p, i) =>
          `<h3>LinkedIn Post ${i + 1} — ${p.angle}</h3>
           <div style="background:#f0f9ff;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px">${p.post.slice(0, 3000)}</div>`
      )
      .join('<br/>');

    await resend.send({
      to: founderEmail,
      subject: `[DSG ONE] Weekly Content — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html: `<div style="font-family:sans-serif;max-width:800px;margin:auto;padding:24px">
        <h1 style="color:#1e293b">DSG ONE — Weekly Content Package</h1>
        <p style="color:#64748b">Generated ${new Date().toISOString().split('T')[0]} · Week ${week} · <a href="${appUrl}/quickstart">Quickstart</a></p>
        ${articleSection}
        <h2>LinkedIn Posts (copy-paste ready)</h2>
        ${postsSection}
        ${errors.length ? `<p style="color:#ef4444">Errors: ${errors.join(', ')}</p>` : ''}
      </div>`,
    });
  }

  return NextResponse.json({
    ok: true,
    week,
    keyword,
    article_title: article.title ?? null,
    linkedin_posts_generated: linkedinPosts.length,
    emailed_to: founderEmail,
    errors: errors.slice(0, 5),
  }, { headers: auth.headers });
}
