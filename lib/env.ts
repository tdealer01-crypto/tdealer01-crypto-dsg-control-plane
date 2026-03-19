function getEnv(name: string, required = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value || "";
}

export const env = {
  appUrl: getEnv("NEXT_PUBLIC_APP_URL", false) || "http://localhost:3000",

  nextPublicSupabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL", false),
  nextPublicSupabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", false),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", false),

  stripeSecretKey: getEnv("STRIPE_SECRET_KEY", false),
  stripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", false),
  stripePriceId: getEnv("STRIPE_PRICE_ID", false),

  resendApiKey: getEnv("RESEND_API_KEY", false),
  resendFromEmail: getEnv("RESEND_FROM_EMAIL", false),

  workosApiKey: getEnv("WORKOS_API_KEY", false),
  workosClientId: getEnv("WORKOS_CLIENT_ID", false),

  triggerSecretKey: getEnv("TRIGGER_SECRET_KEY", false),
  langsmithApiKey: getEnv("LANGSMITH_API_KEY", false)
};
