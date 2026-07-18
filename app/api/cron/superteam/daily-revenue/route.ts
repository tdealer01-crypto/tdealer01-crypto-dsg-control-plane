import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { ContentGenerator } from '@/lib/superteam/content-generator';

export const dynamic = 'force-dynamic';

/**
 * Daily Revenue Generation Orchestration
 * 1. Generate content for high-value bounties
 * 2. Submit all content
 * 3. Track earnings and completions
 * Runs: Daily at 02:00 UTC
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
      `[DAILY-REVENUE] Starting daily revenue cycle at ${new Date().toISOString()}`
    );

    // Step 1: Fetch all listings
    const client = new SuperteamAgentClient(apiKey, 'superteam-agent-live');
    const listings = await client.getListings({ take: 50 });

    // Filter for content bounties
    const contentBounties = listings.filter(
      (l: any) =>
        l.status === 'OPEN' &&
        (l.title?.toLowerCase().includes('twitter') ||
          l.title?.toLowerCase().includes('thread') ||
          l.title?.toLowerCase().includes('post') ||
          l.title?.toLowerCase().includes('deep dive') ||
          l.title?.toLowerCase().includes('analysis') ||
          l.title?.toLowerCase().includes('write'))
    );

    // Sort by reward (highest first)
    const sortedByReward = contentBounties.sort(
      (a: any, b: any) => (b.reward || 0) - (a.reward || 0)
    );

    // Select top 5-10 bounties
    const selectedBounties = sortedByReward.slice(0, 10);

    console.log(
      `[DAILY-REVENUE] Found ${contentBounties.length} bounties, selected ${selectedBounties.length}`
    );

    // Step 2: Generate content for each
    const generatedContent: any[] = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const bounty of selectedBounties) {
      try {
        const contentType = bounty.title?.toLowerCase().includes('deep dive')
          ? 'deep-dive'
          : bounty.title?.toLowerCase().includes('twitter') ||
              bounty.title?.toLowerCase().includes('thread')
            ? 'twitter-thread'
            : 'analysis';

        // Generate content
        let content: any;
        if (contentType === 'twitter-thread') {
          content = ContentGenerator.generateTwitterThread({
            bountyId: bounty.id,
            title: bounty.title,
            type: 'twitter-thread',
            topic: bounty.title,
          });
        } else {
          content = ContentGenerator.generateAnalysis({
            bountyId: bounty.id,
            title: bounty.title,
            type: contentType,
            topic: bounty.title,
            keywords: bounty.skills || [],
          });
        }

        // Step 3: Submit content
        const submitResponse = await fetch(
          `${appUrl}/api/superteam/agent/submit-content`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId,
              bountyId: bounty.id,
              bountyTitle: bounty.title,
              contentType,
              content: content.content,
              wordCount: content.wordCount,
              reward: bounty.reward,
              rewardToken: bounty.rewardToken,
            }),
          }
        );

        const submitData = (await submitResponse.json()) as any;

        if (submitData.success || submitData.telegramResult?.success) {
          console.log(
            `✅ Submitted ${contentType} for ${bounty.title} (${bounty.reward} ${bounty.rewardToken})`
          );
          generatedContent.push({
            bountyId: bounty.id,
            title: bounty.title,
            type: contentType,
            reward: bounty.reward,
            token: bounty.rewardToken,
            wordCount: content.wordCount,
            status: 'submitted',
            submission: submitData.submissionId,
          });
        } else {
          console.warn(
            `⚠️ Submission issue for ${bounty.title}:`,
            submitData.error
          );
          generatedContent.push({
            bountyId: bounty.id,
            title: bounty.title,
            type: contentType,
            reward: bounty.reward,
            token: bounty.rewardToken,
            wordCount: content.wordCount,
            status: 'generated_not_submitted',
            error: submitData.error,
          });
        }
      } catch (error) {
        console.error(
          `Error processing ${bounty.title}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // Step 4: Calculate daily metrics
    const submitted = generatedContent.filter((c) => c.status === 'submitted');
    const generated = generatedContent.filter((c) =>
      c.status.includes('generated')
    );

    const totalValue = generatedContent.reduce(
      (sum: number, c) => sum + (c.reward || 0),
      0
    );

    const submittedValue = submitted.reduce(
      (sum: number, c) => sum + (c.reward || 0),
      0
    );

    const avgWordsPerPiece =
      generatedContent.reduce((sum: number, c) => sum + (c.wordCount || 0), 0) /
      (generatedContent.length || 1);

    console.log(`[DAILY-REVENUE] ✅ Complete`);
    console.log(`  Generated: ${generatedContent.length} pieces`);
    console.log(`  Submitted: ${submitted.length} pieces`);
    console.log(`  Total value: ${totalValue} USDC/USDG`);
    console.log(`  Submitted value: ${submittedValue} USDC/USDG`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cycle: 'daily_revenue_generation',
      agent: agentId,
      discovery: {
        total_bounties: listings.length,
        content_bounties: contentBounties.length,
        selected_for_processing: selectedBounties.length,
      },
      generation: {
        total_pieces: generatedContent.length,
        submitted: submitted.length,
        generated_pending: generated.filter(
          (c) => c.status !== 'submitted'
        ).length,
        avg_words_per_piece: Math.round(avgWordsPerPiece),
      },
      revenue: {
        total_potential: totalValue,
        submitted_value: submittedValue,
        pending_value: totalValue - submittedValue,
        token_mix: 'USDC/USDG',
      },
      content_pieces: generatedContent.slice(0, 10), // Top 10 for response
      daily_projection: {
        pieces_per_day: generatedContent.length,
        revenue_per_day: totalValue,
        revenue_per_week: totalValue * 7,
        revenue_per_month: totalValue * 30,
      },
      next_cycle: 'Tomorrow at 02:00 UTC',
      note: 'Daily revenue generation complete. Content submitted to Superteam with Telegram notifications.',
    });
  } catch (error) {
    console.error('[DAILY-REVENUE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Daily revenue generation failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
