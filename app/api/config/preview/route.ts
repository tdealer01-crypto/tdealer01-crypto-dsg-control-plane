import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format") || "json";

    if (!["json", "yaml", "env"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be one of: json, yaml, env" },
        { status: 400 }
      );
    }

    let content = "";

    if (format === "json") {
      content = generateJsonConfig();
    } else if (format === "yaml") {
      content = generateYamlConfig();
    } else if (format === "env") {
      content = generateEnvConfig();
    }

    return NextResponse.json({
      format,
      content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Config preview error:", error);
    return NextResponse.json(
      { error: "Failed to generate configuration" },
      { status: 500 }
    );
  }
}

function generateJsonConfig(): string {
  return JSON.stringify(
    {
      app: {
        name: "DSG ONE / ProofGate Control Plane",
        environment: process.env.NODE_ENV || "development",
        port: parseInt(process.env.PORT || "3000"),
        host: "localhost",
        logLevel: "info",
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || "${NEXT_PUBLIC_SUPABASE_URL}",
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "${NEXT_PUBLIC_SUPABASE_ANON_KEY}",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "${SUPABASE_SERVICE_ROLE_KEY}",
        projectId: process.env.SUPABASE_PROJECT_ID || "${SUPABASE_PROJECT_ID}",
      },
      auth: {
        mode: "supabase-ssr",
        session: {
          maxAge: 86400,
          updateAge: 3600,
        },
      },
      api: {
        cors: {
          allowOrigins: process.env.DSG_ALLOWED_ORIGINS || "",
          allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          allowHeaders: ["Content-Type", "Authorization"],
        },
        rateLimit: {
          enabled: true,
          window: "1m",
          maxRequests: 100,
        },
      },
      governance: {
        policy: {
          default: process.env.DSG_DEFAULT_POLICY_ID || "policy_default",
          strict: process.env.ACCESS_POLICY === "strict",
        },
        approval: {
          required: process.env.APPROVAL_REQUIRED_DOMAINS ? true : false,
          domains: process.env.APPROVAL_REQUIRED_DOMAINS || "",
        },
      },
      stripe: {
        clientId: process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID || "${NEXT_PUBLIC_STRIPE_CLIENT_ID}",
        secretKey: process.env.STRIPE_SECRET_KEY ? "***REDACTED***" : "${STRIPE_SECRET_KEY}",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? "***REDACTED***" : "${STRIPE_WEBHOOK_SECRET}",
        priceIdPro: process.env.STRIPE_PRICE_PRO || "${STRIPE_PRICE_PRO}",
        priceIdBusiness: process.env.STRIPE_PRICE_BUSINESS || "${STRIPE_PRICE_BUSINESS}",
        meterId: process.env.STRIPE_METER_ID || "${STRIPE_METER_ID}",
        overageRateUsd: parseFloat(process.env.OVERAGE_RATE_USD || "0.001"),
      },
      billing: {
        currency: "USD",
        timezone: "UTC",
        trialDays: 14,
      },
      features: {
        demoBootstrap: process.env.ENABLE_DEMO_BOOTSTRAP === "true",
        hermesAI: true,
        financeGovernance: process.env.DSG_FINANCE_GOVERNANCE_ENABLED === "true",
        ccvs: true,
      },
      integrations: {
        github: {
          appId: process.env.GITHUB_APP_ID || "${GITHUB_APP_ID}",
          webhookSecret: process.env.GITHUB_APP_WEBHOOK_SECRET ? "***REDACTED***" : "${GITHUB_APP_WEBHOOK_SECRET}",
        },
        openrouter: {
          enabled: !!process.env.OPENROUTER_API_KEY,
          apiKey: process.env.OPENROUTER_API_KEY ? "***REDACTED***" : "${OPENROUTER_API_KEY}",
        },
      },
      ai: {
        preferredLanguage: process.env.PREFERRED_LANGUAGE || "en",
        supportedLanguages: ["en", "th", "zh", "ja", "es", "fr", "de", "ko"],
        defaultModel: "claude-3-5-sonnet-20241022",
      },
    },
    null,
    2
  );
}

function generateYamlConfig(): string {
  return `app:
  name: DSG ONE / ProofGate Control Plane
  environment: ${process.env.NODE_ENV || "development"}
  port: ${parseInt(process.env.PORT || "3000")}
  host: localhost
  logLevel: info

supabase:
  url: \${NEXT_PUBLIC_SUPABASE_URL}
  anonKey: \${NEXT_PUBLIC_SUPABASE_ANON_KEY}
  serviceRoleKey: \${SUPABASE_SERVICE_ROLE_KEY}
  projectId: \${SUPABASE_PROJECT_ID}

auth:
  mode: supabase-ssr
  session:
    maxAge: 86400
    updateAge: 3600

api:
  cors:
    allowOrigins: \${DSG_ALLOWED_ORIGINS}
    allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    allowHeaders:
      - Content-Type
      - Authorization
  rateLimit:
    enabled: true
    window: 1m
    maxRequests: 100

governance:
  policy:
    default: ${process.env.DSG_DEFAULT_POLICY_ID || "policy_default"}
    strict: true
  approval:
    required: ${process.env.APPROVAL_REQUIRED_DOMAINS ? true : false}
    domains: \${APPROVAL_REQUIRED_DOMAINS}

stripe:
  clientId: \${NEXT_PUBLIC_STRIPE_CLIENT_ID}
  secretKey: \${STRIPE_SECRET_KEY}
  webhookSecret: \${STRIPE_WEBHOOK_SECRET}
  priceIdPro: \${STRIPE_PRICE_PRO}
  priceIdBusiness: \${STRIPE_PRICE_BUSINESS}
  meterId: \${STRIPE_METER_ID}
  overageRateUsd: 0.001

billing:
  currency: USD
  timezone: UTC
  trialDays: 14

features:
  demoBootstrap: ${process.env.ENABLE_DEMO_BOOTSTRAP === "true"}
  hermesAI: true
  financeGovernance: ${process.env.DSG_FINANCE_GOVERNANCE_ENABLED === "true"}
  ccvs: true

integrations:
  github:
    appId: \${GITHUB_APP_ID}
    webhookSecret: \${GITHUB_APP_WEBHOOK_SECRET}
  openrouter:
    enabled: ${!!process.env.OPENROUTER_API_KEY}
    apiKey: \${OPENROUTER_API_KEY}

ai:
  preferredLanguage: ${process.env.PREFERRED_LANGUAGE || "en"}
  supportedLanguages:
    - en
    - th
    - zh
    - ja
    - es
    - fr
    - de
    - ko
  defaultModel: claude-3-5-sonnet-20241022
`;
}

function generateEnvConfig(): string {
  return `# ============ App URLs ============
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

# Comma-separated cross-origin allowlist for API access
DSG_ALLOWED_ORIGINS=

# ============ Supabase ============
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ============ DSG Core ============
DSG_CORE_MODE=internal
DSG_CORE_URL=
DSG_CORE_API_KEY=
DSG_API_KEY=
DSG_DEFAULT_POLICY_ID=policy_default

# ============ Stripe App OAuth ============
NEXT_PUBLIC_STRIPE_CLIENT_ID=
STRIPE_CLIENT_SECRET=

# ============ Stripe Billing ============
STRIPE_SECRET_KEY=
STRIPE_SANDBOX_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=
STRIPE_METER_ID=

# ============ Overage Pricing ============
OVERAGE_RATE_USD=0.001

# ============ Access Policy ============
ACCESS_MODE=strict
ACCESS_POLICY=strict
APPROVAL_REQUIRED_DOMAINS=
APPROVED_APPROVAL_DOMAINS=
APPROVED_AUTO_JOIN_DOMAINS=

# ============ Internal Services ============
INTERNAL_SERVICE_TOKEN=
INTERNAL_SERVICE_TOKENS=

# ============ Rate Limiting ============
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ============ SSO / Identity ============
WORKOS_API_KEY=
WORKOS_CLIENT_ID=

# ============ Demo Bootstrap ============
ENABLE_DEMO_BOOTSTRAP=false
DEMO_BOOTSTRAP_TOKEN=

# ============ Notifications ============
RESEND_API_KEY=

# ============ OpenRouter ============
OPENROUTER_API_KEY=

# ============ Auth ============
NEXTAUTH_SECRET=
DSG_FINANCE_GOVERNANCE_ENABLED=true

# ============ GitHub App ============
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_APP_AGENT_ID=github-app-gate

# ============ AI Agent Language ============
PREFERRED_LANGUAGE=en
`;
}
