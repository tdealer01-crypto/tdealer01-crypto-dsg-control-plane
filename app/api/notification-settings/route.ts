import { NextRequest, NextResponse } from 'next/server';

type Preferences = {
  email: {
    approvalRequests: boolean;
    gateBlock: boolean;
    agentFailures: boolean;
    weeklyGovernance: boolean;
    billingAlerts: boolean;
  };
  slack: {
    connected: boolean;
    channelId: string | null;
    events: string[];
  };
  pagerduty: {
    connected: boolean;
    integrationKey: string | null;
    triggerOn: string[];
  };
};

// In-memory defaults — replace with per-org DB record in production
let preferences: Preferences = {
  email: {
    approvalRequests: true,   // always on, cannot be disabled
    gateBlock: true,
    agentFailures: true,
    weeklyGovernance: false,
    billingAlerts: true,
  },
  slack: {
    connected: false,
    channelId: null,
    events: ['approval.required', 'agent.failed', 'gate.evaluated'],
  },
  pagerduty: {
    connected: false,
    integrationKey: null,
    triggerOn: ['agent.failed'],
  },
};

export async function GET() {
  return NextResponse.json({ preferences });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (body.email) {
    // approvalRequests is always true — never override it
    preferences = {
      ...preferences,
      email: {
        ...preferences.email,
        ...body.email,
        approvalRequests: true,
      },
    };
  }

  if (body.slack) {
    preferences = {
      ...preferences,
      slack: { ...preferences.slack, ...body.slack },
    };
  }

  if (body.pagerduty) {
    preferences = {
      ...preferences,
      pagerduty: { ...preferences.pagerduty, ...body.pagerduty },
    };
  }

  return NextResponse.json({ preferences });
}
