# Phase 1: Stripe App Setup - Complete Execution Guide

**Branch**: `claude/stripe-apps-cli-setup-1UnVr`  
**Timeline**: 3 days  
**Effort**: Heavy 90% work - just follow commands  

---

## Prerequisites Check (5 minutes)

```bash
# Check Stripe CLI version (need >= 1.12.4)
stripe --version

# If older, upgrade
stripe upgrade

# Check Node.js (need >= 18 LTS)
node --version

# Verify Stripe login
stripe status
```

---

## Step 1: Install Stripe Apps Plugin (2 minutes)

```bash
# Install apps plugin
stripe plugin install apps

# Verify installation
stripe apps -v
# Should show: apps version 1.5.12 or later
```

---

## Step 2: Create Directory Structure (1 minute)

```bash
cd /home/user/tdealer01-crypto-dsg-control-plane

# Create packages directory
mkdir -p packages/stripe-app

# Create subdirectories
mkdir -p packages/stripe-app/src/views
mkdir -p packages/stripe-app/src/lib
mkdir -p packages/stripe-app/tests/unit
mkdir -p packages/stripe-app/docs
mkdir -p packages/stripe-app/.vscode
```

---

## Step 3: Create package.json (React 17 - CRITICAL)

```bash
cat > packages/stripe-app/package.json << 'EOF'
{
  "name": "@dsg-platform/stripe-app",
  "version": "1.0.0",
  "description": "DSG Governance Gate for Stripe App Marketplace",
  "main": "dist/index.js",
  "scripts": {
    "dev": "stripe apps start",
    "dev:local": "stripe apps start --manifest stripe-app.dev.json",
    "start": "stripe apps start",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@stripe/ui-extension-sdk": "^1.8.0",
    "react": "17.0.2",
    "react-dom": "17.0.2"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/react": "17.0.0",
    "@types/react-dom": "17.0.0",
    "@typescript-eslint/eslint-plugin": "^5.0.0",
    "@typescript-eslint/parser": "^5.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
```

---

## Step 4: Create TypeScript Config

```bash
cat > packages/stripe-app/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

---

## Step 5: Create Stripe App Manifest (CRITICAL - defines app structure)

```bash
cat > packages/stripe-app/stripe-app.json << 'EOF'
{
  "id": "com.governance.dsg",
  "version": "1.0.0",
  "name": "DSG Governance Gate",
  "icon": "./icon.png",
  "distribution_type": "private",
  "sandbox_install_compatible": true,
  "stripe_api_access_type": "oauth",
  "allowed_redirect_uris": [
    "http://localhost:3000/stripe/oauth/callback",
    "https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback"
  ],
  "permissions": [
    {
      "permission": "charge_read",
      "purpose": "Read charge details to evaluate governance policies and maintain audit trail"
    },
    {
      "permission": "charge_write",
      "purpose": "Apply DSG governance decisions to charge operations"
    },
    {
      "permission": "payment_intent_read",
      "purpose": "Monitor payment intents for compliance tracking and policy evaluation"
    },
    {
      "permission": "payout_read",
      "purpose": "Track payouts for governance audit trail and compliance reporting"
    },
    {
      "permission": "refund_read",
      "purpose": "Monitor refunds for compliance evidence collection"
    }
  ],
  "ui_extension": {
    "views": [
      {
        "viewport": "stripe.dashboard.charge.detail",
        "component": "ChargeGate"
      },
      {
        "viewport": "stripe.dashboard.payment_intent.detail",
        "component": "PaymentIntentGate"
      },
      {
        "viewport": "stripe.dashboard.payout.detail",
        "component": "PayoutGate"
      }
    ],
    "content_security_policy": {
      "connect-src": [
        "http://localhost:3000/",
        "http://localhost:8000/",
        "https://api.dsg.example.com/",
        "https://tdealer01-crypto-dsg-control-plane.vercel.app/"
      ],
      "purpose": "Allow the app to communicate with DSG governance API for policy evaluation and audit trail recording"
    }
  },
  "post_install_action": {
    "type": "external",
    "url": "http://localhost:3000/stripe/onboarding"
  },
  "constants": {
    "DSG_API_BASE": "http://localhost:3000"
  }
}
EOF
```

---

## Step 6: Create Local Development Manifest Override

```bash
cat > packages/stripe-app/stripe-app.dev.json << 'EOF'
{
  "extends": "stripe-app.json",
  "ui_extension": {
    "content_security_policy": {
      "connect-src": [
        "http://localhost:3000/",
        "http://localhost:8000/"
      ]
    }
  },
  "constants": {
    "DSG_API_BASE": "http://localhost:8000"
  }
}
EOF
```

---

## Step 7: Create Root App View (React 17)

```bash
cat > packages/stripe-app/src/views/App.tsx << 'EOF'
import React from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { Box, Text } from '@stripe/ui-extension-sdk/ui';

const App: React.FC<ExtensionContextValue> = (props) => {
  return (
    <Box>
      <Text>DSG Governance Gate Loaded</Text>
    </Box>
  );
};

export default App;
EOF
```

---

## Step 8: Create ChargeGate View

```bash
cat > packages/stripe-app/src/views/ChargeGate.tsx << 'EOF'
import React, { useState } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { Box, Button, Text, ContextView } from '@stripe/ui-extension-sdk/ui';

const ChargeGate: React.FC<ExtensionContextValue> = (props) => {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      console.log('Charge approved through DSG governance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContextView>
      <Box>
        <Text>DSG Governance Gate - Charge Review</Text>
        <Button onPress={handleApprove} disabled={loading}>
          {loading ? 'Processing...' : 'Approve Charge'}
        </Button>
      </Box>
    </ContextView>
  );
};

export default ChargeGate;
EOF
```

---

## Step 9: Create PaymentIntentGate View

```bash
cat > packages/stripe-app/src/views/PaymentIntentGate.tsx << 'EOF'
import React from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { Box, Text, ContextView } from '@stripe/ui-extension-sdk/ui';

const PaymentIntentGate: React.FC<ExtensionContextValue> = (props) => {
  return (
    <ContextView>
      <Box>
        <Text>DSG Governance Gate - Payment Intent Review</Text>
      </Box>
    </ContextView>
  );
};

export default PaymentIntentGate;
EOF
```

---

## Step 10: Create PayoutGate View

```bash
cat > packages/stripe-app/src/views/PayoutGate.tsx << 'EOF'
import React from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { Box, Text, ContextView } from '@stripe/ui-extension-sdk/ui';

const PayoutGate: React.FC<ExtensionContextValue> = (props) => {
  return (
    <ContextView>
      <Box>
        <Text>DSG Governance Gate - Payout Review</Text>
      </Box>
    </ContextView>
  );
};

export default PayoutGate;
EOF
```

---

## Step 11: Create DSG Client Library

```bash
cat > packages/stripe-app/src/lib/dsg-client.ts << 'EOF'
export interface GatewayRequest {
  action: string;
  context: {
    stripe_account_id: string;
    amount_cents?: number;
    operation_type: string;
  };
}

export interface GatewayResponse {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
  proof?: string;
}

export async function evaluateGateway(
  request: GatewayRequest,
  apiBase: string
): Promise<GatewayResponse> {
  const response = await fetch(`${apiBase}/api/stripe-app/gateway/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Gateway evaluation failed: ${response.statusText}`);
  }

  return response.json();
}

export async function recordAudit(
  decision: GatewayResponse,
  stripeEventId: string,
  apiBase: string
): Promise<void> {
  await fetch(`${apiBase}/api/stripe-app/audit/record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stripe_event_id: stripeEventId,
      decision,
    }),
  });
}
EOF
```

---

## Step 12: Create .gitignore

```bash
cat > packages/stripe-app/.gitignore << 'EOF'
# Dependencies
node_modules/
yarn.lock
package-lock.json

# Build output
dist/
*.tsbuildinfo

# Development
.DS_Store
.env.local
.env.*.local

# Testing
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
logs/
EOF
```

---

## Step 13: Install Dependencies

```bash
cd packages/stripe-app
npm install
```

⏱️ **Wait 2-3 minutes for npm install to complete**

---

## Step 14: Verify React 17 (CRITICAL)

```bash
npm list react
# MUST show: react@17.0.2
# If different, Phase 1 FAILS
```

---

## Step 15: Validate Manifest

```bash
# Go back to project root
cd /home/user/tdealer01-crypto-dsg-control-plane

# Validate manifest structure
stripe apps deploy --validate

# Should pass without errors
```

---

## Step 16: Start Local Development Server

```bash
cd packages/stripe-app
stripe apps start

# You should see:
# ✓ Stripe Apps local development server started
# Open http://localhost:3000 to view in the browser
```

**Leave this running in terminal 1**

---

## Step 17: Test in Stripe Dashboard (New Terminal)

```bash
# In a NEW terminal/tab:

# 1. Go to https://dashboard.stripe.com
# 2. Look for "App preview" banner at the top
# 3. Click "Continue" to enable preview mode
# 4. You should see DSG Governance Gate app

# 5. Navigate to:
#    - A Charge detail page
#    - A Payment Intent detail page  
#    - A Payout detail page
#
# You should see DSG widgets on each

# 6. Open browser DevTools (F12 → Console)
#    Check for any CSP errors (there should be none)
```

---

## Step 18: Watch Live Logs (New Terminal)

```bash
# In another NEW terminal:
stripe logs tail

# You'll see real-time app logs and events
```

---

## Step 19: Verify No Vulnerabilities

```bash
cd packages/stripe-app

# Check React version
npm list react
# MUST be: react@17.0.2

# Check security
npm audit
# Should show: 0 vulnerabilities

# Type check
npm run type-check
# Should show: no errors
```

---

## ✅ Phase 1 Completion Checklist

- [ ] Stripe CLI >= 1.12.4
- [ ] `stripe apps -v` shows >= 1.5.12
- [ ] Node.js >= 18
- [ ] `/packages/stripe-app/` directory created
- [ ] `stripe-app.json` manifest exists and valid
- [ ] `npm list react` shows `react@17.0.2` (CRITICAL)
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] `stripe apps deploy --validate` passes
- [ ] `stripe apps start` runs without errors
- [ ] Dashboard shows 3 DSG views (charge, payment_intent, payout)
- [ ] No CSP errors in browser console
- [ ] All source files in `/src/views/` and `/src/lib/`
- [ ] `.gitignore` created
- [ ] Ready to commit

---

## 🚀 Next Steps (Phase 2)

Once Phase 1 is complete:
1. Commit all changes to `claude/stripe-apps-cli-setup-1UnVr`
2. Create PR
3. Assign Phase 2 (Gateway Handlers) to next agent
4. Other agents continue Phases 3-9 in parallel

---

## Troubleshooting

**Problem**: `stripe apps start` fails  
**Solution**: Run `stripe upgrade` then `stripe plugin upgrade apps`

**Problem**: React version wrong  
**Solution**: Delete `node_modules` and `package-lock.json`, then `npm install`

**Problem**: CSP errors in console  
**Solution**: Check `stripe-app.json` content_security_policy has correct URLs

**Problem**: Views don't appear in Dashboard  
**Solution**: Check viewport names match exactly in manifest vs component exports

---

## Reference Docs

- Stripe Apps: https://docs.stripe.com/stripe-apps
- Create App: https://docs.stripe.com/stripe-apps/create-app.md
- Manifest: https://docs.stripe.com/stripe-apps/reference/app-manifest.md
- CLI: https://docs.stripe.com/stripe-apps/reference/cli.md
