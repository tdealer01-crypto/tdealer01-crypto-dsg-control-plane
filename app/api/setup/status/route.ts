import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const stripeKey = !!process.env.STRIPE_SECRET_KEY;
    const anthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const githubApp = !!process.env.GITHUB_APP_ID;

    const steps = [
      {
        id: "supabase",
        label: "Supabase",
        description: "Database and authentication",
        completed: supabaseUrl && supabaseKey,
        href: "/dashboard/settings/access",
        icon: "🗄️",
      },
      {
        id: "stripe",
        label: "Stripe",
        description: "Billing and payments",
        completed: stripeKey,
        href: "/dashboard/billing",
        icon: "💳",
      },
      {
        id: "anthropic",
        label: "Anthropic API",
        description: "Hermes AI runtime",
        completed: anthropicKey,
        href: "/dashboard/hermes",
        icon: "🤖",
      },
      {
        id: "github",
        label: "GitHub App",
        description: "Repository integration",
        completed: githubApp,
        href: "/dashboard/settings/security",
        icon: "🐙",
      },
    ];

    const completedSteps = steps.filter((s) => s.completed).length;
    const completionPercent = Math.round((completedSteps / steps.length) * 100);

    const config = {
      format: process.env.DSG_CONFIG_FORMAT || "env",
      hasSupabase: supabaseUrl && supabaseKey,
      hasStripe: stripeKey,
      hasAnthropic: anthropicKey,
      completionPercent,
    };

    return NextResponse.json({
      steps,
      config,
      summary: {
        total: steps.length,
        completed: completedSteps,
        pending: steps.length - completedSteps,
      },
    });
  } catch (error) {
    console.error("Setup status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch setup status" },
      { status: 500 }
    );
  }
}
