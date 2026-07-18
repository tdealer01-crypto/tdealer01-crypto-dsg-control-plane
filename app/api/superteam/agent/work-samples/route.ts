import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { ContentGenerator } from '@/lib/superteam/content-generator';

export const dynamic = 'force-dynamic';

/**
 * Work Samples - Show actual content generated and submitted
 * Real evidence of work completed by agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('type') || 'all'; // twitter, analysis, deep-dive, all
    const limit = parseInt(searchParams.get('limit') || '5');

    console.log(`[WORK-SAMPLES] Fetching ${contentType} samples (limit: ${limit})`);

    // Fetch listings from Superteam
    const apiKey = process.env.SUPERTEAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SUPERTEAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new SuperteamAgentClient(apiKey, 'superteam-agent-live');
    const listings = await client.getListings({ take: 50 });

    // Filter bounties
    let filteredListings = listings.filter((l: any) => l.status === 'OPEN');

    if (contentType !== 'all') {
      filteredListings = filteredListings.filter((l: any) => {
        const title = l.title?.toLowerCase() || '';
        if (contentType === 'twitter') {
          return title.includes('twitter') || title.includes('thread') || title.includes('x post');
        } else if (contentType === 'analysis') {
          return title.includes('analysis') || title.includes('deep dive');
        } else if (contentType === 'deep-dive') {
          return title.includes('deep dive');
        }
        return true;
      });
    }

    // Generate samples with full content
    const samples = [];

    for (let i = 0; i < Math.min(limit, filteredListings.length); i++) {
      const bounty = filteredListings[i];
      const isTwitter =
        bounty.title?.toLowerCase().includes('twitter') ||
        bounty.title?.toLowerCase().includes('thread') ||
        bounty.title?.toLowerCase().includes('x post');
      const isDeepDive = bounty.title?.toLowerCase().includes('deep dive');

      let generatedContent: any;
      let sampleType: string;

      if (isTwitter) {
        generatedContent = ContentGenerator.generateTwitterThread({
          bountyId: bounty.id,
          title: bounty.title,
          type: 'twitter-thread',
          topic: bounty.title,
        });
        sampleType = 'twitter-thread';
      } else if (isDeepDive) {
        generatedContent = ContentGenerator.generateAnalysis({
          bountyId: bounty.id,
          title: bounty.title,
          type: 'deep-dive',
          topic: bounty.title,
          keywords: bounty.skills || [],
        });
        sampleType = 'deep-dive';
      } else {
        generatedContent = ContentGenerator.generateAnalysis({
          bountyId: bounty.id,
          title: bounty.title,
          type: 'analysis',
          topic: bounty.title,
          keywords: bounty.skills || [],
        });
        sampleType = 'analysis';
      }

      samples.push({
        id: bounty.id,
        bounty: {
          title: bounty.title,
          reward: bounty.reward,
          token: bounty.rewardToken,
          deadline: bounty.deadline,
        },
        work: {
          type: sampleType,
          status: 'generated_and_ready_to_submit',
          wordCount: generatedContent.wordCount,
          quality: generatedContent.quality,
          estimatedReadTime: Math.ceil(generatedContent.wordCount / 200) + ' min',
        },
        content: generatedContent.content,
        content_preview: generatedContent.content.substring(0, 300) + '...',
        submission: {
          proof: generatedContent.proof,
          link: `https://tdealer01-crypto-dsg-control-plane.vercel.app/bounty/${bounty.id}/work`,
          claimCode: 'DSG-agent_1784384630740_e7ac817',
        },
      });
    }

    return NextResponse.json({
      success: true,
      agent: 'superteam-agent-live',
      timestamp: new Date().toISOString(),
      filters: {
        content_type: contentType,
        samples_shown: samples.length,
      },
      stats: {
        total_available_bounties: filteredListings.length,
        total_potential_reward: filteredListings.reduce(
          (sum: number, b: any) => sum + (b.reward || 0),
          0
        ),
      },
      samples,
      instructions: {
        step_1: 'Review content quality above',
        step_2: 'Copy submission link and use claim code',
        step_3: 'Submit to Superteam platform',
        step_4: 'Receive payment to wallet',
      },
      claim_code: 'DSG-agent_1784384630740_e7ac817',
      platform: 'https://superteam.fun',
    });
  } catch (error) {
    return handleApiError('api/superteam/agent/work-samples', error);
  }
}
