import { NextRequest, NextResponse } from 'next/server';
import { superteamClient, SuperteamBounty } from '@/lib/superteam/client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface BountySyncResult {
  success: boolean;
  fetched: number;
  created: number;
  updated: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const status = searchParams.get('status');

    // Fetch bounties from Superteam API
    const bounties = await superteamClient.getBounties({
      category: category || undefined,
      level: level || undefined,
      status: status || undefined,
    });

    return NextResponse.json({
      success: true,
      count: bounties.length,
      bounties,
    });
  } catch (error) {
    console.error('Error fetching bounties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounties', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Sync bounties to database
    const bounties = await superteamClient.getBounties();
    const supabase = createClient();

    let created = 0;
    let updated = 0;

    for (const bounty of bounties) {
      const { data: existing } = await supabase
        .from('superteam_bounties')
        .select('id')
        .eq('id', bounty.id)
        .single();

      if (existing) {
        await supabase
          .from('superteam_bounties')
          .update({
            title: bounty.title,
            description: bounty.description,
            reward: bounty.reward,
            status: bounty.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bounty.id);
        updated++;
      } else {
        await supabase.from('superteam_bounties').insert({
          id: bounty.id,
          title: bounty.title,
          description: bounty.description,
          reward: bounty.reward,
          reward_token: bounty.rewardToken,
          category: bounty.category,
          status: bounty.status,
          level: bounty.level,
          skills: bounty.skills,
          posted_by: bounty.postedBy,
          created_at: bounty.createdAt,
          updated_at: bounty.updatedAt,
          deadline: bounty.deadline,
        });
        created++;
      }
    }

    // Log sync
    await supabase.from('superteam_sync_log').insert({
      id: `sync-${Date.now()}`,
      bounties_fetched: bounties.length,
      bounties_created: created,
      bounties_updated: updated,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      fetched: bounties.length,
      created,
      updated,
    } as BountySyncResult);
  } catch (error) {
    console.error('Error syncing bounties:', error);

    const supabase = createClient();
    await supabase.from('superteam_sync_log').insert({
      id: `sync-${Date.now()}-error`,
      status: 'error',
      error_message: String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync bounties',
        details: String(error)
      },
      { status: 500 }
    );
  }
}
