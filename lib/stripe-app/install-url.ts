import type { StripeInstallMode } from "@/lib/stripe-app/oauth-config";

const FORBIDDEN_INSTALL_PARAMS = ["channel_link"];
const OAUTH_AUTHORIZE_URL = "https://marketplace.stripe.com/oauth/v2/authorize";

export function resolveStripeInstallMode(value: string | null): StripeInstallMode {
  if (value === null || value === "live") return "live";
  if (value === "sandbox") return "sandbox";
  throw new Error("Stripe install mode must be live or sandbox");
}

export function buildStripeInstallUrl({
  mode,
  configuredUrl,
  clientId,
  redirectUri,
  state,
}: {
  mode: StripeInstallMode;
  configuredUrl?: string;
  clientId?: string;
  redirectUri: string;
  state: string;
}) {
  if (!configuredUrl) {
    throw new Error(`${mode} public Stripe OAuth URL is not configured`);
  }

  const url = new URL(configuredUrl);
  if (url.origin !== new URL(OAUTH_AUTHORIZE_URL).origin || url.pathname !== new URL(OAUTH_AUTHORIZE_URL).pathname) {
    throw new Error("Stripe OAuth URL must use the public marketplace authorize endpoint");
  }

  for (const param of FORBIDDEN_INSTALL_PARAMS) {
    if (url.searchParams.has(param)) {
      throw new Error(`${mode} Stripe OAuth URL contains forbidden ${param}`);
    }
  }

  const configuredClientId = url.searchParams.get("client_id");
  if (!configuredClientId) {
    throw new Error(`${mode} public Stripe OAuth URL is missing client_id`);
  }
  if (clientId && configuredClientId !== clientId) {
    throw new Error(`${mode} Stripe OAuth URL client_id does not match configured client_id`);
  }

  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url;
}
