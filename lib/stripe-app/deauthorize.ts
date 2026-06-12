import {
  resolveStripeClientId,
  resolveStripeSecretKey,
  type StripeInstallMode,
} from "@/lib/stripe-app/oauth-config";

export async function deauthorizeStripeAccount(mode: StripeInstallMode, stripeAccountId: string) {
  const clientId = resolveStripeClientId(mode);
  const secretKey = resolveStripeSecretKey(mode);
  if (!clientId || !secretKey) {
    throw new Error(`${mode} Stripe deauthorization is not configured`);
  }

  const response = await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ client_id: clientId, stripe_user_id: stripeAccountId }),
  });

  if (!response.ok) {
    throw new Error(`Stripe OAuth deauthorization failed with HTTP ${response.status}`);
  }
}
