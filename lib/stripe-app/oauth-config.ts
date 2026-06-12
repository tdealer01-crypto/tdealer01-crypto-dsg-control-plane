export type StripeInstallMode = "live" | "sandbox";

export function isStripeInstallMode(value: unknown): value is StripeInstallMode {
  return value === "live" || value === "sandbox";
}

export function resolveStripeClientId(mode: StripeInstallMode) {
  return mode === "sandbox"
    ? process.env.STRIPE_SANDBOX_CONNECT_CLIENT_ID || process.env.NEXT_PUBLIC_STRIPE_SANDBOX_CLIENT_ID
    : process.env.STRIPE_CONNECT_CLIENT_ID || process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;
}

export function resolveStripeSecretKey(mode: StripeInstallMode) {
  return mode === "sandbox"
    ? process.env.STRIPE_SANDBOX_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;
}

export function resolveStripeConfiguredInstallUrl(mode: StripeInstallMode) {
  return mode === "sandbox"
    ? process.env.STRIPE_SANDBOX_INSTALL_URL
    : process.env.STRIPE_LIVE_INSTALL_URL;
}
