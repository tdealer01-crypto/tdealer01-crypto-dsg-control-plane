#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks if revenue automation system is ready to use
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const checks = [];

function check(name, status, details = '') {
  checks.push({ name, status, details });
  const icon = status === '✅' ? '✅' : status === '⚠️' ? '⚠️' : '❌';
  console.log(`${icon} ${name}${details ? ` - ${details}` : ''}`);
}

async function verifyWebhookEndpoint() {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      email: 'verify@test.com',
      name: 'Verify Test',
      source: 'verify',
      company: 'Test',
      pricingTier: 'Test'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(
      'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace',
      options,
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(res.statusCode === 200 && json.success);
          } catch {
            resolve(false);
          }
        });
      }
    );

    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();

    setTimeout(() => resolve(false), 5000);
  });
}

async function main() {
  console.log('\n🔍 Revenue Automation Setup Verification\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Check documentation files
  console.log('📚 Documentation Files:');
  const docs = [
    'docs/REVENUE-AUTOMATION-SETUP.md',
    'docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md',
    'docs/APPSUMO-WEBHOOK-SETUP.md',
    'docs/ZAPIER-SETUP-GUIDE.md'
  ];

  docs.forEach((doc) => {
    const exists = fs.existsSync(path.join(projectRoot, doc));
    check(path.basename(doc), exists ? '✅' : '❌');
  });

  // 2. Check script files
  console.log('\n⚙️  Revenue Scripts:');
  const scripts = [
    'scripts/revenue/setup-hubspot.mjs',
    'scripts/revenue/process-leads.mjs',
    'scripts/revenue/marketplace-monitor.mjs',
    'scripts/revenue/webhook-tester.mjs'
  ];

  scripts.forEach((script) => {
    const exists = fs.existsSync(path.join(projectRoot, script));
    check(path.basename(script), exists ? '✅' : '❌');
  });

  // 3. Check webhook endpoint
  console.log('\n🌐 Webhook Endpoint:');
  console.log('   Testing live endpoint...');
  const endpointOk = await verifyWebhookEndpoint();
  check('Webhook live', endpointOk ? '✅' : '⚠️', endpointOk ? 'Responding' : 'Check network/deployment');

  // 4. Check environment setup
  console.log('\n🔐 Environment Variables:');
  const hasHubSpot = process.env.HUBSPOT_API_KEY ? '✅' : '⚠️';
  const hasSlack = process.env.SLACK_WEBHOOK_URL ? '✅' : '⚠️';
  check('HUBSPOT_API_KEY', hasHubSpot, hasHubSpot === '✅' ? 'Set' : 'Not set');
  check('SLACK_WEBHOOK_URL', hasSlack, hasSlack === '✅' ? 'Set' : 'Optional');

  // 5. Check npm scripts
  console.log('\n📦 NPM Scripts:');
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const revenueScripts = [
    'revenue:setup:hubspot',
    'revenue:process:leads',
    'revenue:monitor:marketplace',
    'revenue:init'
  ];

  revenueScripts.forEach((script) => {
    const exists = packageJson.scripts && packageJson.scripts[script];
    check(`npm run ${script}`, exists ? '✅' : '❌');
  });

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = checks.filter((c) => c.status === '✅').length;
  const warnings = checks.filter((c) => c.status === '⚠️').length;
  const failed = checks.filter((c) => c.status === '❌').length;

  console.log(`📊 Summary: ${passed} passed, ${warnings} warnings, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ Revenue automation system is ready!\n');
    console.log('🚀 Next steps:');
    console.log('  1. Read: docs/REVENUE-AUTOMATION-SETUP.md');
    console.log('  2. Pick marketplace: AWS, AppSumo, or G2');
    console.log('  3. Test webhook: npm run revenue:test:webhook\n');
  } else {
    console.log('❌ Some components are missing. Install them first.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Error during verification:', error.message);
  process.exit(1);
});
