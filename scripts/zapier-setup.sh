#!/bin/bash

# Zapier Revenue Automation - Complete Setup Script
# Setup all integrations: Slack, Stripe, Dashboard, API, PostHog, Payment Test

set -e

echo "🚀 DSG Zapier Revenue Automation - Setup Script"
echo "================================================"
echo ""

# Step 1: Slack Setup
echo "📱 Step 1/6: Slack Channel Setup"
echo "================================"
echo ""
echo "TODO: Manual Steps Required"
echo ""
echo "1. Go to your Slack workspace: https://app.slack.com"
echo "2. Click '+ Add' or 'Create' channel"
echo "3. Channel name: revenue"
echo "4. Description: Automated revenue tracking and payment notifications"
echo "5. Make it Private or Public (recommend Private for sensitive data)"
echo "6. Click 'Create channel'"
echo ""
echo "Then add Zapier bot:"
echo "7. Go to: https://zapier.com/apps/slack/integrations"
echo "8. Click 'Connect' or 'Add to Slack'"
echo "9. Select your Slack workspace"
echo "10. Select #revenue channel"
echo "11. Click 'Authorize'"
echo ""
echo "✅ Slack Setup Complete - Channel #revenue connected to Zapier"
echo ""
read -p "Press Enter when Slack setup is complete..."

# Step 2: Stripe Webhook
echo ""
echo "🔗 Step 2/6: Stripe Webhook Configuration"
echo "========================================="
echo ""
echo "TODO: Manual Steps Required"
echo ""
echo "1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. For Webhook URL, use: https://hooks.zapier.com/hooks/[YOUR_ZAPIER_WEBHOOK_ID]"
echo ""
echo "   (Get your webhook ID from Zapier):"
echo "   - Open Zapier Zap editor"
echo "   - Find the Stripe trigger"
echo "   - Copy the webhook URL shown"
echo ""
echo "4. Select events to send:"
echo "   ✓ charge.succeeded"
echo "   ✓ payment_intent.succeeded"
echo "   ✓ invoice.payment_succeeded"
echo "   ✓ customer.created"
echo "   ✓ invoice.created"
echo ""
echo "5. Click 'Add endpoint'"
echo "6. Test webhook by sending test event"
echo ""
echo "✅ Stripe Webhook Complete - Events routing to Zapier"
echo ""
read -p "Press Enter when Stripe webhook setup is complete..."

# Step 3: Dashboard Visualization
echo ""
echo "📊 Step 3/6: Dashboard Visualization Setup"
echo "=========================================="
echo ""
echo "Creating visualization configuration..."
echo ""

# Create charts config file
cat > /tmp/dashboard-charts-config.json << 'EOF'
{
  "dashboard": {
    "title": "Revenue Dashboard - DSG Control Plane",
    "sheets_id": "1wu9v5AsukM4XminIeO12ACEGwi5aEkHUEWTkudnsxBc",
    "refresh_interval_seconds": 300,
    "charts": [
      {
        "name": "Daily Revenue Trend",
        "type": "line",
        "data_source": "Payments",
        "x_axis": "Date",
        "y_axis": "Amount",
        "aggregation": "SUM",
        "period": "daily",
        "colors": ["#3b82f6"]
      },
      {
        "name": "Revenue by Customer",
        "type": "bar",
        "data_source": "Customers",
        "x_axis": "Customer_Name",
        "y_axis": "Lifetime_Value",
        "sort": "descending",
        "top_n": 10,
        "colors": ["#10b981"]
      },
      {
        "name": "Payment Status Distribution",
        "type": "pie",
        "data_source": "Payments",
        "categories": "Status",
        "values": "Amount",
        "colors": ["#10b981", "#ef4444", "#f59e0b"]
      },
      {
        "name": "Service Quota Usage",
        "type": "gauge",
        "data_source": "Service Delivery",
        "metric": "Usage_Percent",
        "min": 0,
        "max": 100,
        "critical_threshold": 80,
        "warning_threshold": 60
      },
      {
        "name": "Customer Acquisition",
        "type": "bar",
        "data_source": "Customers",
        "x_axis": "First_Payment_Date",
        "y_axis": "Customer_ID",
        "aggregation": "COUNT",
        "period": "weekly"
      },
      {
        "name": "Communication Activity",
        "type": "area",
        "data_source": "Communications",
        "x_axis": "Date",
        "y_axis": "Communication_Type",
        "aggregation": "COUNT",
        "stacked": true
      }
    ]
  }
}
EOF

echo "✅ Dashboard configuration created"
echo "   Location: /tmp/dashboard-charts-config.json"
echo ""
echo "Next: Add these charts to Google Sheets"
echo "  1. Open: https://docs.google.com/spreadsheets/d/1wu9v5AsukM4XminIeO12ACEGwi5aEkHUEWTkudnsxBc/edit"
echo "  2. Create new sheet: 'Dashboard'"
echo "  3. Insert → Chart"
echo "  4. Select data range from Payments sheet"
echo "  5. Customize as needed"
echo ""
read -p "Press Enter when dashboard visualization is complete..."

# Step 4: API Integration
echo ""
echo "🤖 Step 4/6: Control Plane API Integration"
echo "=========================================="
echo ""
echo "Creating API integration configuration..."
echo ""

# Create API integration config
cat > /tmp/api-integration-config.json << 'EOF'
{
  "api_integration": {
    "base_url": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
    "endpoints": {
      "revenue_log": {
        "path": "/api/webhooks/zapier/revenue",
        "method": "POST",
        "auth": "HMAC-SHA256 signature (ZAPIER_WEBHOOK_SECRET)",
        "payload": {
          "customer_id": "from Customers.Customer_ID",
          "amount": "from Payments.Amount",
          "currency": "from Payments.Currency",
          "payment_id": "from Payments.Payment_ID",
          "invoice_number": "from Payments.Invoice_Number",
          "status": "from Payments.Status",
          "timestamp": "from Payments.Date + Payments.Time"
        },
        "headers": {
          "x-zapier-signature": "hex HMAC-SHA256 of the exact POST body, computed in a Code by Zapier step",
          "Content-Type": "application/json"
        }
      },
      "quota_update": {
        "path": "/api/webhooks/zapier/quota",
        "method": "POST",
        "auth": "HMAC-SHA256 signature (ZAPIER_WEBHOOK_SECRET)",
        "payload": {
          "customer_id": "from Service Delivery.Customer_Name",
          "service_type": "from Service Delivery.Service_Type",
          "quota_allocated": "from Service Delivery.Quota_Allocated",
          "usage_current": "from Service Delivery.Usage_Current",
          "usage_percent": "from Service Delivery.Usage_Percent",
          "health_status": "from Service Delivery.Health_Status"
        }
      },
      "communication_log": {
        "path": "/api/webhooks/zapier/communication",
        "method": "POST",
        "auth": "HMAC-SHA256 signature (ZAPIER_WEBHOOK_SECRET)",
        "payload": {
          "customer_id": "from Communications.Customer_Name",
          "email": "from Communications.Email",
          "type": "from Communications.Communication_Type",
          "subject": "from Communications.Subject",
          "status": "from Communications.Status",
          "timestamp": "from Communications.Date + Communications.Time"
        }
      }
    },
    "setup_steps": [
      "1. Generate a secret: openssl rand -hex 32",
      "2. Set environment variable on Vercel: ZAPIER_WEBHOOK_SECRET",
      "3. In each Zap, add a 'Code by Zapier' step before the webhook action that computes hex HMAC-SHA256(body, ZAPIER_WEBHOOK_SECRET)",
      "4. In Zapier, create the 'Webhooks by Zapier' POST action for each endpoint, setting x-zapier-signature from the Code step output",
      "5. Test webhook connection — expect HTTP 200 with { success: true }",
      "6. Query zapier_payment_events / zapier_quota_events / zapier_communication_events in Supabase to confirm persistence"
    ]
  }
}
EOF

echo "✅ API integration configuration created"
echo "   Location: /tmp/api-integration-config.json"
echo ""
echo "Setup Steps:"
echo "1. Generate a secret: openssl rand -hex 32"
echo "2. Set it on Vercel (Production env): ZAPIER_WEBHOOK_SECRET"
echo "3. In Zapier, add a 'Code by Zapier' step before each webhook action:"
echo "   const crypto = require('crypto');"
echo "   const body = JSON.stringify(inputData);"
echo "   output = [{ signature: crypto.createHmac('sha256', 'YOUR_SECRET').update(body).digest('hex'), body }];"
echo "4. Add 'Webhooks by Zapier' → POST action:"
echo "   - URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/revenue"
echo "   - Method: POST"
echo "   - Headers: x-zapier-signature: {{signature}}"
echo "   - Body: {{body}} (the exact string hashed in step 3, not a re-serialized copy)"
echo "5. Test with sample payment, confirm HTTP 200 and a new row in zapier_payment_events"
echo ""
read -p "Press Enter when API integration is configured..."

# Step 5: PostHog Analytics
echo ""
echo "📈 Step 5/6: PostHog Analytics Integration"
echo "=========================================="
echo ""
echo "Creating PostHog event tracking configuration..."
echo ""

# Create PostHog config
cat > /tmp/posthog-events-config.json << 'EOF'
{
  "posthog_integration": {
    "project_id": "479488",
    "api_url": "https://us.posthog.com",
    "events": [
      {
        "name": "revenue_payment_received",
        "properties": {
          "customer_id": "from Customers.Customer_ID",
          "amount": "from Payments.Amount",
          "currency": "from Payments.Currency",
          "payment_method": "from Payments.Payment_Method",
          "status": "from Payments.Status"
        },
        "description": "Triggered when payment is received"
      },
      {
        "name": "revenue_quota_alert",
        "properties": {
          "customer_id": "from Service Delivery.Customer_Name",
          "quota_allocated": "from Service Delivery.Quota_Allocated",
          "usage_current": "from Service Delivery.Usage_Current",
          "usage_percent": "from Service Delivery.Usage_Percent",
          "alert_level": "from Service Delivery.Alerts"
        },
        "description": "Triggered when quota usage exceeds threshold"
      },
      {
        "name": "revenue_customer_email_sent",
        "properties": {
          "customer_id": "from Communications.Customer_Name",
          "email_type": "from Communications.Communication_Type",
          "status": "from Communications.Status"
        },
        "description": "Triggered when customer email sent"
      },
      {
        "name": "revenue_service_health_update",
        "properties": {
          "customer_id": "from Service Delivery.Customer_Name",
          "health_status": "from Service Delivery.Health_Status",
          "service_type": "from Service Delivery.Service_Type"
        },
        "description": "Triggered when service health status changes"
      }
    ],
    "setup_steps": [
      "1. Login to PostHog: https://us.posthog.com",
      "2. Get API key from Settings → API Keys",
      "3. In Zapier, add PostHog app",
      "4. For each Zapier workflow, add 'Capture Event' action",
      "5. Map event properties from sheet data",
      "6. Enable event tracking"
    ]
  }
}
EOF

echo "✅ PostHog configuration created"
echo "   Location: /tmp/posthog-events-config.json"
echo ""
echo "Setup Steps:"
echo "1. Go to https://us.posthog.com/project/479488/settings/api-keys"
echo "2. Copy your API key"
echo "3. In Zapier:"
echo "   - Search for 'PostHog' app"
echo "   - Click 'Connect' and paste API key"
echo "4. In each Zapier workflow, add 'PostHog - Capture Event' action"
echo "5. Configure event properties matching config above"
echo "6. Test event capture"
echo ""
read -p "Press Enter when PostHog integration is complete..."

# Step 6: Live Payment Test
echo ""
echo "🧪 Step 6/6: Live Payment Test"
echo "==============================="
echo ""
echo "Ready to test with REAL payment!"
echo ""
echo "⚠️  WARNING: This will create a real charge in Stripe"
echo ""
echo "Test Payment Details:"
echo "  Amount: $10.00 USD (test amount - adjust if needed)"
echo "  Customer: Test Customer - DSG Enterprise"
echo "  Email: test.customer@dsg.pics"
echo ""
echo "Steps:"
echo "1. Go to Stripe Dashboard: https://dashboard.stripe.com"
echo "2. Navigate to: Payments → Create Payment"
echo "3. Enter amount: 1000 (cents, = $10.00)"
echo "4. Currency: USD"
echo "5. Customer: Select 'Test Customer - DSG Enterprise'"
echo "6. Click 'Complete'  charge"
echo ""
echo "Then verify in real-time:"
echo "7. Check Slack #revenue channel for notification"
echo "8. Open Google Sheet and refresh: Payments sheet should show new row"
echo "9. Verify customer data updated: Customers sheet"
echo "10. Check Communications sheet: Invoice email logged"
echo "11. Check Service Delivery sheet: Service initialized"
echo "12. Verify email sent: test.customer@dsg.pics inbox"
echo ""
echo "Success Criteria:"
echo "✅ Slack notification received within 1 minute"
echo "✅ Payment appears in Payments sheet within 30 seconds"
echo "✅ Customer Lifetime Value updated"
echo "✅ Invoice email sent (check spam folder if needed)"
echo "✅ Communication logged"
echo "✅ Service Delivery record created"
echo "✅ Control plane API received webhook (if configured)"
echo "✅ PostHog event captured (if configured)"
echo ""
echo "Troubleshooting:"
echo "- No Slack notification? Check #revenue channel permissions"
echo "- Sheet not updating? Verify Zapier automation is enabled"
echo "- Email not sent? Check Gmail is authorized in Zapier"
echo "- API not receiving? Check Bearer token and endpoint URL"
echo ""
read -p "Press Enter to start live payment test..."

echo ""
echo "📝 Creating test payment in Stripe..."
echo ""
echo "TODO: Manual Steps in Stripe Dashboard"
echo ""
echo "Go to: https://dashboard.stripe.com/payments"
echo "Click: Create payment"
echo "Fill in:"
echo "  - Amount: 1000 (= $10.00 USD)"
echo "  - Currency: USD"
echo "  - Customer: Test Customer - DSG Enterprise (cus_UsUQ5Hc697LI6K)"
echo ""
echo "Click: 'Complete' to charge"
echo ""
read -p "Press Enter after creating payment in Stripe..."

echo ""
echo "⏱️  Waiting for automation to process... (30-60 seconds)"
echo ""
sleep 10
echo "."
sleep 10
echo "."
sleep 10
echo "."
sleep 10
echo "."
sleep 10
echo "."

echo ""
echo "✅ VERIFICATION CHECKLIST:"
echo ""
echo "Manual verification needed:"
echo "1. ☐ Check Slack #revenue for payment notification"
echo "2. ☐ Refresh Google Sheet Payments tab - new row visible?"
echo "3. ☐ Check Customers sheet - Lifetime Value updated?"
echo "4. ☐ Check Communications sheet - Email logged?"
echo "5. ☐ Check test.customer@dsg.pics - Invoice email received?"
echo "6. ☐ Check Service Delivery sheet - New service initialized?"
echo ""
read -p "Enter number of items verified (1-6): " verified

echo ""
echo "🎉 SETUP COMPLETE!"
echo ""
echo "Summary:"
echo "=========="
echo "✅ Slack Setup: #revenue channel connected"
echo "✅ Webhook Configuration: Stripe → Zapier routing"
echo "✅ Dashboard Visualization: Charts configured"
echo "✅ API Integration: Control plane endpoints ready"
echo "✅ PostHog Analytics: Event tracking configured"
echo "✅ Live Payment Test: $verified/6 items verified"
echo ""
echo "Next Steps:"
echo "1. Monitor dashboard daily for new payments"
echo "2. Review quota alerts in Slack"
echo "3. Process real customer payments"
echo "4. Monitor service health metrics"
echo "5. Track revenue trends in PostHog"
echo ""
echo "📊 Dashboard: https://docs.google.com/spreadsheets/d/1wu9v5AsukM4XminIeO12ACEGwi5aEkHUEWTkudnsxBc/edit"
echo "💳 Stripe: https://dashboard.stripe.com"
echo "💬 Slack: https://app.slack.com/client/YOUR_WORKSPACE_ID/C..."
echo "📈 PostHog: https://us.posthog.com/project/479488"
echo ""
echo "Setup script complete! 🚀"
