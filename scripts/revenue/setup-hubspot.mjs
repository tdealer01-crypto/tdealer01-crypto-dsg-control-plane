#!/usr/bin/env node
/**
 * HubSpot Setup Script
 * Creates contacts, deals, and pipelines for DSG ONE revenue automation
 *
 * Usage: HUBSPOT_API_KEY=... node scripts/revenue/setup-hubspot.mjs
 */

import fetch from 'node-fetch';

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

if (!API_KEY) {
  console.error('❌ Error: HUBSPOT_API_KEY environment variable not set');
  console.error('Get your API key from: https://app.hubspot.com/private-apps');
  process.exit(1);
}

async function hubspotRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`HubSpot API Error (${response.status}):`, error);
    throw new Error(`HubSpot API request failed: ${response.status}`);
  }

  return response.json();
}

async function testConnection() {
  try {
    const result = await hubspotRequest('/crm/v3/objects/contacts?limit=1');
    console.log('✅ Connected to HubSpot!');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to HubSpot:', error.message);
    return false;
  }
}

async function createContactProperty(name, label, type = 'string') {
  try {
    await hubspotRequest(`/crm/v3/properties/contacts/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        label,
        type,
        fieldType: 'text',
        groupName: 'contactinformation',
        description: `Property for DSG ONE revenue automation: ${label}`
      })
    });
    console.log(`✅ Created property: ${label}`);
  } catch (error) {
    if (error.message.includes('409') || error.message.includes('already')) {
      console.log(`⏭️  Property exists: ${label}`);
    } else {
      console.log(`⏭️  Property (skipped): ${label}`);
    }
  }
}

async function createDealStage(stageName, stageOrder) {
  try {
    const pipelines = await hubspotRequest('/crm/v3/pipelines/deals');
    const defaultPipeline = pipelines.results?.[0];

    if (!defaultPipeline) {
      console.warn('⏭️  No pipelines found (will use default)');
      return;
    }

    const stages = defaultPipeline.stages || [];
    if (stages.some(s => s.label === stageName)) {
      console.log(`⏭️  Stage exists: ${stageName}`);
      return;
    }

    await hubspotRequest(
      `/crm/v3/pipelines/deals/${defaultPipeline.id}/stages`,
      {
        method: 'POST',
        body: JSON.stringify({
          label: stageName,
          displayOrder: stageOrder,
          isClosed: stageName.toLowerCase().includes('won') || stageName.toLowerCase().includes('lost')
        })
      }
    );
    console.log(`✅ Created stage: ${stageName}`);
  } catch (error) {
    console.log(`⏭️  Stage (skipped): ${stageName}`);
  }
}

async function setupLeadScoringProperties() {
  console.log('\n📋 Setting up lead scoring properties...\n');

  const properties = [
    { name: 'hs_lead_score', label: 'Lead Score', type: 'number' },
    { name: 'marketplace_source', label: 'Marketplace Source', type: 'enumeration' },
    { name: 'pricing_tier_interested', label: 'Pricing Tier Interested', type: 'enumeration' },
    { name: 'demo_requested', label: 'Demo Requested', type: 'bool' },
    { name: 'api_keys_sent', label: 'API Keys Sent', type: 'bool' }
  ];

  for (const prop of properties) {
    await createContactProperty(prop.name, prop.label, prop.type);
  }
}

async function setupDealStages() {
  console.log('\n🎯 Setting up deal stages...\n');

  const stages = [
    { name: 'Prospect', order: 1 },
    { name: 'Lead', order: 2 },
    { name: 'Qualified', order: 3 },
    { name: 'Trial', order: 4 },
    { name: 'Negotiation', order: 5 },
    { name: 'Won', order: 6 },
    { name: 'Lost', order: 7 }
  ];

  for (const stage of stages) {
    await createDealStage(stage.name, stage.order);
  }
}

async function createTestContact() {
  console.log('\n👤 Creating test contact...\n');

  const email = `test-${Date.now()}@dsg.pics`;

  try {
    const result = await hubspotRequest('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          firstname: 'DSG',
          lastname: 'Test',
          email: email,
          phone: '+1234567890'
        }
      })
    });

    console.log(`✅ Created test contact: ${result.id}`);
    console.log(`   Email: ${email}`);
  } catch (error) {
    console.log(`⏭️  Test contact (skipped)`, error.message);
  }
}

async function main() {
  console.log('🚀 HubSpot DSG ONE Setup\n');
  console.log('This script will:\n');
  console.log('1. Test HubSpot connection');
  console.log('2. Create custom properties for lead scoring');
  console.log('3. Create deal pipeline stages');
  console.log('4. Optionally create a test contact\n');

  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  await setupLeadScoringProperties();
  await setupDealStages();
  await createTestContact();

  console.log('\n✨ HubSpot setup complete!');
  console.log('\nNext steps:');
  console.log('1. Go to https://app.hubspot.com and verify properties/stages');
  console.log('2. Set up Zapier workflows using the AUTHORIZATION-GUIDE-ZAPIER.md');
  console.log('3. Run: npm run revenue:webhook:setup to set up webhook\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
