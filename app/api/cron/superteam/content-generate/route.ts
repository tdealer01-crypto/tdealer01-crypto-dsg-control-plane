import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import { SuperteamAgentClient, Listing } from '@/lib/superteam/agent-client';

export const dynamic = 'force-dynamic';

/**
 * Cron job: Generate and submit Twitter threads + analysis content
 * Runs to identify suitable bounties and auto-generate high-value content
 * Runs: Daily (can be increased to 2-3x daily for more revenue)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const agentId = 'agent_1784384630740_e7ac817';
    const apiKey = process.env.SUPERTEAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'SUPERTEAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(
      `[CONTENT-GEN] Starting content generation at ${new Date().toISOString()}`
    );

    // Fetch all listings
    const client = new SuperteamAgentClient(apiKey, 'superteam-agent-live');
    const listings = await client.getListings({ take: 50 });

    // Filter for content-generatable bounties
    const contentBounties = listings.filter(
      (l: Listing) =>
        l.status === 'OPEN' &&
        (l.title?.toLowerCase().includes('twitter') ||
          l.title?.toLowerCase().includes('thread') ||
          l.title?.toLowerCase().includes('post') ||
          l.title?.toLowerCase().includes('deep dive') ||
          l.title?.toLowerCase().includes('analysis') ||
          l.title?.toLowerCase().includes('write'))
    );

    console.log(
      `[CONTENT-GEN] Found ${contentBounties.length} content-suitable bounties`
    );

    // Categorize bounties
    const twitterBounties = contentBounties.filter(
      (l: Listing) =>
        l.title?.toLowerCase().includes('twitter') ||
        l.title?.toLowerCase().includes('thread') ||
        l.title?.toLowerCase().includes('post') ||
        l.title?.toLowerCase().includes('x post')
    );

    const analysisBounties = contentBounties.filter(
      (l: Listing) =>
        l.title?.toLowerCase().includes('deep dive') ||
        l.title?.toLowerCase().includes('analysis') ||
        l.title?.toLowerCase().includes('write')
    );

    // Calculate potential revenue
    const twitterRevenue = twitterBounties.reduce(
      (sum: number, b: Listing) => sum + (b.reward || 0),
      0
    );
    const analysisRevenue = analysisBounties.reduce(
      (sum: number, b: Listing) => sum + (b.reward || 0),
      0
    );
    const totalPotential = twitterRevenue + analysisRevenue;

    // Select top bounties to work on
    const selectedBounties = [
      ...twitterBounties.slice(0, 3),
      ...analysisBounties.slice(0, 2),
    ];

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const generationResults = [];

    // Generate content for each selected bounty
    for (const bounty of selectedBounties) {
      try {
        const contentType = twitterBounties.includes(bounty)
          ? 'twitter-thread'
          : 'deep-dive';

        const genResponse = await fetch(
          `${appUrl}/api/superteam/agent/generate-content`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bountyId: bounty.id,
              bountyTitle: bounty.title,
              bountyType: contentType,
              topic: bounty.title,
              keywords: bounty.skills || [],
              agentId,
            }),
          }
        );

        const genData = (await genResponse.json()) as any;

        if (genData.success) {
          console.log(
            `✅ Generated ${contentType} for: ${bounty.title} (${bounty.reward} ${bounty.rewardToken})`
          );
          generationResults.push({
            bountyId: bounty.id,
            title: bounty.title,
            type: contentType,
            reward: bounty.reward,
            token: bounty.rewardToken,
            wordCount: genData.metadata.wordCount,
            status: 'generated',
          });
        } else {
          console.error(
            `❌ Failed to generate content for: ${bounty.title}`,
            genData.error
          );
        }
      } catch (error) {
        console.error(`Generation error for ${bounty.title}:`, error);
      }
    }

    console.log(
      `[CONTENT-GEN] ✅ Generation complete - ${generationResults.length} content pieces created`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      agent: agentId,
      discovery: {
        total_listings: listings.length,
        content_bounties: contentBounties.length,
        twitter_bounties: twitterBounties.length,
        analysis_bounties: analysisBounties.length,
      },
      revenue_potential: {
        twitter_total: twitterRevenue,
        analysis_total: analysisRevenue,
        combined_total: totalPotential,
        token: 'USDC/USDG mixed',
      },
      generation: {
        bounties_selected: selectedBounties.length,
        content_generated: generationResults.length,
        content_pieces: generationResults,
      },
      next_run: 'Daily or on-demand',
      note: 'Content generated and ready for submission. Next: agent will submit to Superteam and track completions.',
    });
  } catch (error) {
    return handleApiError('api/cron/superteam/content-generate', error);
  }
}
