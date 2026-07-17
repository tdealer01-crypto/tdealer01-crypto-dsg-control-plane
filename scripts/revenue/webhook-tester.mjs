#!/usr/bin/env node

/**
 * Webhook Tester - Test the marketplace lead capture webhook locally
 * Usage: node webhook-tester.mjs [aws|appsumo|g2|custom]
 */

import https from 'https';

const WEBHOOK_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace';

const testPayloads = {
  aws: {
    email: 'enterprise-customer@aws-example.com',
    name: 'Jane Smith',
    company: 'AWS Enterprise Corp',
    source: 'aws-marketplace',
    pricingTier: 'Enterprise'
  },
  appsumo: {
    email: 'startup-founder@appsumo-example.com',
    name: 'John Chen',
    company: 'StartUp AI',
    source: 'appsumo',
    pricingTier: 'Professional'
  },
  g2: {
    email: 'manager@g2-example.com',
    name: 'Sarah Johnson',
    company: 'Tech Solutions Inc',
    source: 'g2-reviews',
    pricingTier: 'Standard'
  },
  custom: null
};

function sendWebhook(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(WEBHOOK_URL, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const testType = process.argv[2] || 'aws';
  let payload = testPayloads[testType];

  if (!payload) {
    if (testType === 'custom') {
      // Interactive mode for custom payload
      console.log('📝 Enter custom payload (JSON):');
      payload = {
        email: 'custom@example.com',
        name: 'Custom Test',
        company: 'Test Corp',
        source: 'custom-test',
        pricingTier: 'Basic'
      };
    } else {
      console.error(`❌ Unknown test type: ${testType}`);
      console.log('Available types: aws, appsumo, g2, custom');
      process.exit(1);
    }
  }

  console.log(`\n🚀 Testing webhook with ${testType} payload...`);
  console.log(`📤 Sending to: ${WEBHOOK_URL}`);
  console.log(`📋 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const response = await sendWebhook(payload);

    console.log(`\n✅ Response received (HTTP ${response.statusCode})`);

    try {
      const body = JSON.parse(response.body);
      console.log('📥 Response body:', JSON.stringify(body, null, 2));

      if (body.success) {
        console.log(`\n✅ SUCCESS! Lead captured with ID: ${body.id}`);
        console.log(`⏰ Timestamp: ${body.received_at}`);
      } else {
        console.log(`\n⚠️  Response indicates issue: ${body.error}`);
      }
    } catch (e) {
      console.log('📥 Response body:', response.body);
    }
  } catch (error) {
    console.error(`\n❌ Error testing webhook:`);
    console.error(error.message);

    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Hint: Cannot reach webhook URL. Check:');
      console.error('  1. Internet connection');
      console.error('  2. Vercel deployment is active');
      console.error('  3. URL is correct');
    }

    process.exit(1);
  }
}

main();
