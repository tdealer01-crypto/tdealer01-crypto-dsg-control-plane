#!/usr/bin/env node
/**
 * Zapier Webhook Handler Setup
 * Creates webhook URLs for Zapier to send leads to DSG ONE backend
 *
 * This creates webhook routes in your Next.js app for Zapier integration
 * Usage: node scripts/revenue/zapier-webhook-handler.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Route handler template
const webhookRouteTemplate = `/**
 * Zapier Webhook Handler
 * Receives leads from Zapier marketplace automations
 *
 * POST /api/webhooks/zapier/marketplace
 * Body: { email, name, company, source, pricingTier }
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import { buildCorsHeaders } from '@/lib/security/cors';
import { readJsonBody } from '@/lib/security/request-json';

export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  try {
    if (request.method === 'OPTIONS') {
      return NextResponse.json({}, { headers: buildCorsHeaders() });
    }

    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        {
          status: 405,
          headers: buildCorsHeaders()
        }
      );
    }

    const body = await readJsonBody(request, 1024); // 1KB max for webhook

    // Validate required fields
    const { email, name, company, source, pricingTier } = body;
    if (!email || !name || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, source' },
        {
          status: 400,
          headers: buildCorsHeaders()
        }
      );
    }

    // Log lead received
    console.log('📥 Lead received from Zapier:', {
      email,
      name,
      source,
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate with your lead processing system
    // Examples:
    // - Store in Supabase
    // - Send to HubSpot via API
    // - Trigger email automation
    // - Record in PostHog analytics
    // - Send Slack notification

    return NextResponse.json(
      {
        success: true,
        message: 'Lead received',
        id: \`lead_\${Date.now()}_\${Math.random().toString(36).slice(2)}\`,
        received_at: new Date().toISOString()
      },
      {
        status: 200,
        headers: buildCorsHeaders()
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return handleApiError(error, 'POST', '/api/webhooks/zapier/marketplace');
  }
}

export { handler as POST, handler as OPTIONS };
`;

const webrtcRoutePath = 'app/api/webhooks/zapier/marketplace/route.ts';

async function createWebhookRoute() {
  console.log('🔧 Setting up Zapier webhook handler...\n');

  const fullPath = path.join(process.cwd(), webrtcRoutePath);
  const dirPath = path.dirname(fullPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }

  // Check if file already exists
  if (fs.existsSync(fullPath)) {
    console.log(`⏭️  File already exists: ${webrtcRoutePath}`);
    return;
  }

  // Write the file
  fs.writeFileSync(fullPath, webhookRouteTemplate);
  console.log(`✅ Created webhook handler: ${webrtcRoutePath}`);
}

async function printZapierSetupInstructions() {
  console.log('\n📋 Zapier Webhook Setup Instructions:\n');
  console.log('1. Your webhook URL (when deployed):');
  console.log('   https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace\n');

  console.log('2. To test locally:');
  console.log('   npm run dev  # Start dev server\n');

  console.log('3. Test webhook with curl:');
  console.log('   curl -X POST http://localhost:3000/api/webhooks/zapier/marketplace \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{');
  console.log('       "email": "test@example.com",');
  console.log('       "name": "Test User",');
  console.log('       "company": "Test Co",');
  console.log('       "source": "aws-marketplace",');
  console.log('       "pricingTier": "professional"');
  console.log('     }\'\n');

  console.log('4. In Zapier:');
  console.log('   - Create a new Zap');
  console.log('   - Add action: Webhooks by Zapier → POST');
  console.log('   - URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace');
  console.log('   - Body: { "email": {{email}}, "name": {{name}}, ... }\n');
}

async function main() {
  console.log('🚀 Zapier Webhook Setup\n');

  try {
    await createWebhookRoute();
    await printZapierSetupInstructions();

    console.log('✨ Webhook setup complete!');
    console.log('\nNext steps:');
    console.log('1. Review the webhook handler at:', webrtcRoutePath);
    console.log('2. Customize the lead processing logic (TODO section)');
    console.log('3. Deploy to Vercel: npm run deploy:prod');
    console.log('4. Configure Zapier workflow with your webhook URL\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
