import { NextRequest, NextResponse } from 'next/server';
import { ContentGenerator } from '@/lib/superteam/content-generator';

export const dynamic = 'force-dynamic';

interface ContentRequest {
  bountyId: string;
  bountyTitle: string;
  bountyType: 'twitter-thread' | 'analysis' | 'deep-dive';
  topic?: string;
  keywords?: string[];
  agentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContentRequest;
    const { bountyId, bountyTitle, bountyType, topic, keywords, agentId } = body;

    if (!bountyId || !bountyTitle || !bountyType || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate content based on type
    let generatedContent: any;

    if (bountyType === 'twitter-thread') {
      generatedContent = ContentGenerator.generateTwitterThread({
        bountyId,
        title: bountyTitle,
        type: 'twitter-thread',
        topic: topic || bountyTitle,
      });
    } else if (bountyType === 'deep-dive' || bountyType === 'analysis') {
      generatedContent = ContentGenerator.generateAnalysis({
        bountyId,
        title: bountyTitle,
        type: bountyType,
        topic: topic || bountyTitle,
        keywords,
      });
    } else {
      return NextResponse.json(
        { error: 'Unknown content type' },
        { status: 400 }
      );
    }

    console.log(`✅ Generated ${bountyType} content for ${bountyTitle}`);
    console.log(`   Word count: ${generatedContent.wordCount}`);
    if (generatedContent.tweetCount) {
      console.log(`   Tweet count: ${generatedContent.tweetCount}`);
    }

    return NextResponse.json({
      success: true,
      bountyId,
      contentType: bountyType,
      content: generatedContent.content,
      metadata: {
        wordCount: generatedContent.wordCount,
        tweetCount: generatedContent.tweetCount,
        quality: generatedContent.quality,
        proof: generatedContent.proof,
      },
      message: 'Content generated successfully. Ready for submission.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      {
        error: 'Content generation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
