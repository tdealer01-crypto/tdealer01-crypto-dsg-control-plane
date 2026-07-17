#!/usr/bin/env node
/**
 * Lead Processing Pipeline
 * Fetches leads from HubSpot, scores them, and sends notifications
 *
 * Usage: HUBSPOT_API_KEY=... SLACK_WEBHOOK_URL=... node scripts/revenue/process-leads.mjs
 */

import fetch from 'node-fetch';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const BASE_URL = 'https://api.hubapi.com';

if (!HUBSPOT_API_KEY) {
  console.error('❌ Error: HUBSPOT_API_KEY environment variable not set');
  process.exit(1);
}

async function hubspotRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error (${response.status}): ${error}`);
  }

  return response.json();
}

async function getRecentLeads(limit = 50) {
  console.log(`📥 Fetching recent leads (limit: ${limit})...`);

  try {
    const result = await hubspotRequest(
      `/crm/v3/objects/contacts?limit=${limit}&sort=-hs_analytics_date_first_visit`,
      {
        headers: {
          'CRM-ASSOCIATIONS': 'deals'
        }
      }
    );

    return result.results || [];
  } catch (error) {
    console.error('Error fetching leads:', error.message);
    return [];
  }
}

function scoreContact(contact) {
  let score = 0;
  const props = contact.properties;

  // Email engagement
  if (props.hs_email_open) score += 10;
  if (props.hs_email_click) score += 15;

  // Website engagement
  if (props.hs_analytics_num_visits > 5) score += 20;
  if (props.hs_analytics_num_visits > 10) score += 10;

  // Marketplace source
  const source = props.marketplace_source || props.hs_lead_source || 'unknown';
  if (source.includes('aws')) score += 25;
  if (source.includes('appsume')) score += 20;
  if (source.includes('g2')) score += 15;

  // Demo/Interest
  if (props.demo_requested === 'true') score += 30;
  if (props.pricing_tier_interested) score += 15;

  // Contact frequency
  if (props.hs_analytics_num_contacts > 0) score += 10;

  // Time since first visit (newer is better)
  const firstVisit = parseInt(props.hs_analytics_date_first_visit);
  const daysSinceVisit = (Date.now() - firstVisit) / (1000 * 60 * 60 * 24);
  if (daysSinceVisit < 7) score += 20;
  if (daysSinceVisit < 30) score += 10;

  return Math.min(100, score);
}

async function updateContactScore(contactId, score) {
  try {
    await hubspotRequest(`/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          hs_lead_score: Math.round(score)
        }
      })
    });
    return true;
  } catch (error) {
    console.error(`Error updating score for ${contactId}:`, error.message);
    return false;
  }
}

async function sendSlackNotification(contact, score) {
  if (!SLACK_WEBHOOK_URL) {
    return;
  }

  const props = contact.properties;
  const color = score >= 75 ? '#36a64f' : score >= 50 ? '#ffa500' : '#999999';

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `🔥 High-Value Lead: ${props.firstname} ${props.lastname}`,
          title_link: `https://app.hubspot.com/crm/contacts/${contact.id}`,
          fields: [
            {
              title: 'Email',
              value: props.email || 'N/A',
              short: true
            },
            {
              title: 'Lead Score',
              value: `${Math.round(score)}/100`,
              short: true
            },
            {
              title: 'Source',
              value: props.marketplace_source || props.hs_lead_source || 'Direct',
              short: true
            },
            {
              title: 'Company',
              value: props.company || 'N/A',
              short: true
            },
            {
              title: 'Visits',
              value: props.hs_analytics_num_visits || '0',
              short: true
            },
            {
              title: 'Email Opens',
              value: props.hs_email_open ? 'Yes' : 'No',
              short: true
            }
          ],
          footer: 'DSG ONE Lead Scoring',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });
  } catch (error) {
    console.error('Error sending Slack notification:', error.message);
  }
}

async function processLeads() {
  console.log('🔄 Processing leads...\n');

  const leads = await getRecentLeads();
  if (leads.length === 0) {
    console.log('No leads found');
    return;
  }

  console.log(`Found ${leads.length} leads\n`);

  let hotLeads = 0;
  let warmLeads = 0;

  for (const lead of leads) {
    const score = scoreContact(lead);
    await updateContactScore(lead.id, score);

    const email = lead.properties.email || 'unknown';
    const name = lead.properties.firstname || 'Contact';

    if (score >= 75) {
      console.log(`🔥 HOT:  ${name} (${email}) - ${Math.round(score)}/100`);
      hotLeads++;
      if (score >= 80) {
        await sendSlackNotification(lead, score);
      }
    } else if (score >= 50) {
      console.log(`🌤️  WARM: ${name} (${email}) - ${Math.round(score)}/100`);
      warmLeads++;
    } else {
      console.log(`❄️  COLD: ${name} (${email}) - ${Math.round(score)}/100`);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   🔥 Hot leads (75+):  ${hotLeads}`);
  console.log(`   🌤️  Warm leads (50-74): ${warmLeads}`);
  console.log(`   ❄️  Cold leads (<50):  ${leads.length - hotLeads - warmLeads}`);
}

processLeads().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
