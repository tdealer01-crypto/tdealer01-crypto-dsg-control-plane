/**
 * Example: Slack Webhook Integration with DSG
 *
 * Sends DSG validation results to Slack channel
 *
 * Setup:
 * 1. Create Incoming Webhook in Slack
 * 2. Set SLACK_WEBHOOK_URL environment variable
 * 3. Call notifyDSGResult() after arbiter validation
 */

const https = require('https')

/**
 * Notify Slack of DSG validation result
 * @param {Object} dsgResult - Result from /api/public/test/arbiter-validation
 * @param {string} webhookUrl - Slack incoming webhook URL
 */
async function notifyDSGResult(dsgResult, webhookUrl) {
  const decision = dsgResult.decision
  const reason = dsgResult.reason
  const shareableLink = dsgResult.shareableLink

  // Choose emoji and color based on decision
  const emoji = decision === 'ALLOW' ? ':white_check_mark:' : ':x:'
  const color = decision === 'ALLOW' ? '#36a64f' : '#ff0000'

  // Build Slack message
  const message = {
    attachments: [
      {
        color: color,
        title: `${emoji} DSG Arbiter Validation: ${decision}`,
        text: reason,
        fields: [
          {
            title: 'Min Arbiters',
            value: String(dsgResult.minArbiterCount),
            short: true
          },
          {
            title: 'Actual Arbiters',
            value: String(dsgResult.actualArbiterCount),
            short: true
          },
          {
            title: 'CCVS Level',
            value: dsgResult.compliance?.ccvs_level || 'L2',
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(dsgResult.timestamp).toLocaleString(),
            short: true
          }
        ],
        actions: [
          {
            type: 'button',
            text: 'View Evidence',
            url: shareableLink
          }
        ],
        footer: 'DSG Control Plane',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  }

  return sendToSlack(message, webhookUrl)
}

/**
 * Send message to Slack webhook
 * @param {Object} payload - Slack message payload
 * @param {string} webhookUrl - Slack incoming webhook URL
 */
function sendToSlack(payload, webhookUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, message: data })
        } else {
          reject(new Error(`Slack API error: ${res.statusCode}`))
        }
      })
    })

    req.on('error', reject)
    req.write(JSON.stringify(payload))
    req.end()
  })
}

// Example usage
async function example() {
  // Simulate DSG result
  const dsgResult = {
    decision: 'ALLOW',
    reason: 'ARBITER_COUNT_SUFFICIENT: got 3, need 2',
    minArbiterCount: 2,
    actualArbiterCount: 3,
    compliance: { ccvs_level: 'L2' },
    shareableLink: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/public/test-result/test-123',
    timestamp: new Date().toISOString()
  }

  try {
    await notifyDSGResult(
      dsgResult,
      process.env.SLACK_WEBHOOK_URL
    )
    console.log('✅ Notification sent to Slack')
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error.message)
  }
}

// Run if called directly
if (require.main === module) {
  example()
}

module.exports = { notifyDSGResult, sendToSlack }
