#!/usr/bin/env node
/**
 * API Key Rotation Script for DSG Control Plane
 * Complies with EU AI Act Article 28 - 90-day key rotation
 * Run: node scripts/rotate-key.ts [--dry-run] [--key=KEY_NAME]
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ROTATION_DAYS = 90;
const GRACE_PERIOD_DAYS = 7;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

interface ApiKey {
  id: string;
  key_name: string;
  key_hash: string;
  key_prefix: string;
  service: string;
  environment: 'production' | 'preview' | 'development';
  status: 'active' | 'rotating' | 'revoked' | 'expired';
  created_at: string;
  rotated_at: string | null;
  expires_at: string;
  rotated_by: string | null;
  rotation_count: number;
  metadata: Record<string, any>;
}

interface RotationResult {
  key_name: string;
  old_key_id: string;
  new_key_id: string;
  new_key: string;
  rotated_at: string;
  expires_at: string;
  grace_period_ends: string;
}

async function generateApiKey(prefix: string): Promise<{ key: string; hash: string }> {
  const randomPart = randomBytes(32).toString('base64url');
  const key = `${prefix}_${randomPart}`;
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, hash };
}

async function getActiveKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ApiKey[];
}

async function getKeysNeedingRotation(): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('status', 'active')
    .lt('expires_at', new Date(Date.now() + ROTATION_DAYS * 24 * 60 * 60 * 1000).toISOString())
    .order('expires_at', { ascending: true });

  if (error) throw error;
  return data as ApiKey[];
}

async function rotateKey(keyName: string, rotatedBy: string = 'system'): Promise<RotationResult> {
  const { data: oldKey, error: fetchError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_name', keyName)
    .eq('status', 'active')
    .single();

  if (fetchError || !oldKey) {
    throw new Error(`Key ${keyName} not found or not active`);
  }

  const prefix = oldKey.key_prefix;
  const { key: newKey, hash: newHash } = await generateApiKey(prefix);
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ROTATION_DAYS * 24 * 60 * 60 * 1000);
  const graceEnds = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Mark old key as rotating
  await supabase
    .from('api_keys')
    .update({ 
      status: 'rotating',
      rotated_at: new Date().toISOString(),
      rotated_by: rotatedBy,
    })
    .eq('id', oldKey.id);

  // Create new key
  const { data: newKeyRecord, error } = await supabase
    .from('api_keys')
    .insert({
      key_name: oldKey.key_name,
      key_hash: newHash,
      key_prefix: prefix,
      service: oldKey.service,
      environment: oldKey.environment,
      status: 'active',
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      rotated_from: oldKey.id,
      rotated_by: rotatedBy,
      rotation_count: (oldKey.rotation_count || 0) + 1,
      metadata: {
        ...oldKey.metadata,
        previous_key_id: oldKey.id,
        rotation_reason: 'scheduled_90_day',
      },
    })
    .select()
    .single();

  if (error) throw error;

  // Schedule old key revocation after grace period
  await supabase
    .from('key_revocation_schedule')
    .insert({
      key_id: oldKey.id,
      scheduled_at: graceEnds.toISOString(),
      reason: 'grace_period_expired',
    });

  return {
    key_name: oldKey.key_name,
    old_key_id: oldKey.id,
    new_key_id: newKeyRecord.id,
    new_key: newKey,
    rotated_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    grace_period_ends: graceEnds.toISOString(),
  };
}

async function rotateAllDue(dryRun: boolean = false): Promise<RotationResult[]> {
  const keys = await getKeysNeedingRotation();
  const results: RotationResult[] = [];

  console.log(`🔍 Found ${keys.length} keys needing rotation`);
  
  for (const key of keys) {
    console.log(`\n🔄 Rotating: ${key.key_name} (expires: ${key.expires_at})`);
    
    if (dryRun) {
      console.log(`  [DRY RUN] Would rotate ${key.key_name}`);
      continue;
    }

    try {
      const result = await rotateKey(key.key_name);
      results.push(result);
      console.log(`  ✅ Rotated: ${result.new_key_id}`);
      console.log(`     New key: ${result.new_key}`);
      console.log(`     Grace period ends: ${result.grace_period_ends}`);
    } catch (err) {
      console.error(`  ❌ Failed to rotate ${key.key_name}:`, err);
    }
  }

  return results;
}

async function revokeExpiredKeys(): Promise<void> {
  const { data: revoked, error } = await supabase
    .from('api_keys')
    .update({ status: 'expired', rotated_at: new Date().toISOString() })
    .eq('status', 'rotating')
    .lt('rotated_at', new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString())
    .select('id, key_name');

  if (error) throw error;
  
  if (revoked && revoked.length > 0) {
    console.log(`\n🗑️  Expired ${revoked.length} keys after grace period:`);
    revoked.forEach(k => console.log(`  - ${k.key_name} (${k.id})`));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificKey = args.find(a => a.startsWith('--key='))?.split('=')[1];

  console.log('🔐 DSG API Key Rotation - EU AI Act Compliance');
  console.log(`📅 Rotation interval: ${ROTATION_DAYS} days`);
  console.log(`⏳ Grace period: ${GRACE_PERIOD_DAYS} days`);
  console.log(`🔍 Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  try {
    if (specificKey) {
      if (dryRun) {
        console.log(`[DRY RUN] Would rotate specific key: ${specificKey}`);
      } else {
        const result = await rotateKey(specificKey);
        console.log('\n✅ Key rotated successfully!');
        console.log(`New key: ${result.new_key}`);
        console.log(`Expires: ${result.expires_at}`);
        console.log(`Grace period ends: ${result.grace_period_ends}`);
      }
    } else {
      const results = await rotateAllDue(dryRun);
      await revokeExpiredKeys();
      
      console.log('\n📊 Rotation Summary:');
      console.log(`  Total rotated: ${results.length}`);
      console.log(`  Dry run: ${dryRun ? 'YES' : 'NO'}`);
      
      if (!dryRun && results.length > 0) {
        console.log('\n📋 Next Steps:');
        console.log('  1. Update Vercel/GitHub/environment with new keys');
        console.log(`  2. Old keys valid until grace period ends`);
        console.log('  3. Run: vercel env add KEY_NAME production <<< "new_key"');
      }
    }

    console.log('\n✅ Rotation complete!');
  } catch (err) {
    console.error('❌ Rotation failed:', err);
    process.exit(1);
  }
}

main();