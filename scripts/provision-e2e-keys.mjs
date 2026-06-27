#!/usr/bin/env node
/**
 * Provision E2E test credentials for revenue-happy-path.spec.ts
 *
 * Creates two orgs + agents with pre-set API keys:
 *   - e2e-free-org  / e2e-free-agent  (plan: free,  quota: 60)
 *   - e2e-paid-org  / e2e-paid-agent  (plan: pro,   quota: 10,000)
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/provision-e2e-keys.mjs
 *
 * Idempotent — re-running regenerates API keys and prints new values.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('ERROR: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

function makeKey() {
  const raw = `dsg_live_${randomBytes(4).toString('hex')}_${randomBytes(12).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

async function upsertOrg(id, name, plan) {
  const { error } = await db.from('organizations').upsert(
    { id, name, plan, slug: id, status: 'active' },
    { onConflict: 'id' }
  );
  if (error) throw new Error(`org upsert failed: ${error.message}`);
}

async function upsertAgent(id, orgId, name, keyHash) {
  const { error } = await db.from('agents').upsert(
    { id, org_id: orgId, name, api_key_hash: keyHash, status: 'active', monthly_limit: 10000 },
    { onConflict: 'id' }
  );
  if (error) throw new Error(`agent upsert failed: ${error.message}`);
}

async function main() {
  console.log('Provisioning E2E test credentials...\n');

  const freeKey = makeKey();
  const paidKey = makeKey();

  await upsertOrg('e2e-free-org', 'E2E Free Test Org', 'free');
  await upsertOrg('e2e-paid-org', 'E2E Paid Test Org', 'pro');

  await upsertAgent('e2e-free-agent', 'e2e-free-org', 'E2E Free Agent', freeKey.hash);
  await upsertAgent('e2e-paid-agent', 'e2e-paid-org', 'E2E Paid Agent', paidKey.hash);

  console.log('Done. Add these to Vercel → Settings → Environment Variables:\n');
  console.log(`E2E_FREE_API_KEY=${freeKey.raw}`);
  console.log(`E2E_FREE_AGENT_ID=e2e-free-agent`);
  console.log(`E2E_PAID_API_KEY=${paidKey.raw}`);
  console.log(`E2E_PAID_AGENT_ID=e2e-paid-agent`);
  console.log(`PLAYWRIGHT_STAGING_GATE=true`);
  console.log(`PLAYWRIGHT_BASE_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app`);
  console.log('\nAlso add the same 6 vars to GitHub → Settings → Secrets → Actions');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
