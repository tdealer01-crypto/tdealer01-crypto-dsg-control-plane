#!/usr/bin/env node

/**
 * Sync Secrets from GitHub to Vercel
 *
 * This script synchronizes secrets from GitHub repository secrets
 * to Vercel environment variables, ensuring consistency across platforms.
 *
 * Usage: node scripts/sync-secrets.mjs [--env production|preview|development]
 *
 * Environment:
 * - VERCEL_TOKEN: Required for Vercel API access
 * - VERCEL_PROJECT_ID: Vercel project ID
 * - GITHUB_TOKEN: For reading GitHub secrets (if needed)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REQUIRED_SECRETS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROJECT_ID',
  'CRON_SECRET',
];

const OPTIONAL_SECRETS = [
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_SANDBOX_SECRET_KEY',
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_WEBHOOK_SECRET',
  'STRIPE_CONNECT_CLIENT_ID',
  'STRIPE_SANDBOX_CONNECT_CLIENT_ID',
];

const ALL_SECRETS = [...REQUIRED_SECRETS, ...OPTIONAL_SECRETS];

async function getGitHubSecret(secretName) {
  try {
    const { stdout } = await execAsync(
      `gh secret view ${secretName} --json value -q .value 2>/dev/null || echo ""`,
      { shell: '/bin/bash' }
    );
    return stdout.trim();
  } catch (error) {
    console.warn(`⚠️  Could not read GitHub secret: ${secretName}`);
    return null;
  }
}

async function setVercelEnvVar(name, value, environments = ['production', 'preview', 'development']) {
  if (!value) {
    console.warn(`⚠️  Skipping ${name} — no value found`);
    return false;
  }

  if (!process.env.VERCEL_PROJECT_ID) {
    console.error('ERROR: VERCEL_PROJECT_ID not set');
    return false;
  }

  try {
    for (const env of environments) {
      const cmd = `vercel env add ${name} ${env} ${value}`;
      try {
        await execAsync(cmd, {
          stdio: 'pipe',
          shell: '/bin/bash'
        });
        console.log(`✓ ${name} → Vercel (${env})`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`→ ${name} already in Vercel (${env})`);
        } else {
          throw error;
        }
      }
    }
    return true;
  } catch (error) {
    console.error(`✗ Failed to sync ${name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Synchronizing secrets from GitHub to Vercel...\n');

  if (!process.env.VERCEL_TOKEN) {
    console.error('ERROR: VERCEL_TOKEN environment variable not set');
    console.error('Get your token from: https://vercel.com/account/tokens');
    process.exit(1);
  }

  if (!process.env.VERCEL_PROJECT_ID) {
    console.error('ERROR: VERCEL_PROJECT_ID environment variable not set');
    console.error('Find your project ID in Vercel project settings');
    process.exit(1);
  }

  let successCount = 0;
  let requiredMissing = [];

  for (const secret of ALL_SECRETS) {
    const value = await getGitHubSecret(secret);
    const isRequired = REQUIRED_SECRETS.includes(secret);

    if (!value) {
      if (isRequired) {
        requiredMissing.push(secret);
      } else {
        console.log(`ℹ️  ${secret} not found (optional)`);
      }
      continue;
    }

    const synced = await setVercelEnvVar(secret, value);
    if (synced) successCount++;
  }

  console.log(`\n✅ Sync complete: ${successCount}/${ALL_SECRETS.length} secrets processed`);

  if (requiredMissing.length > 0) {
    console.error(`\n❌ Missing required secrets in GitHub:`);
    requiredMissing.forEach(s => console.error(`   - ${s}`));
    console.error('\nAdd them in: Repository Settings → Secrets and variables → Actions secrets');
    process.exit(1);
  }

  console.log('\n📋 Next steps:');
  console.log('1. Verify secrets in Vercel: https://vercel.com/dashboard');
  console.log('2. Test deployment: npm run deploy:preview');
  console.log('3. Monitor: Vercel dashboard → Deployments → Runtime logs');
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
