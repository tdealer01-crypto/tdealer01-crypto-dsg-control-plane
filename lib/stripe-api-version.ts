/**
 * The Stripe API version every client in this repository pins to.
 *
 * Without an explicit `apiVersion`, each client silently adopts whatever
 * version the installed SDK defaults to, so bumping the `stripe` dependency
 * changes live request/response shapes with no diff to review. Pinning here
 * makes that a deliberate, single-line change.
 *
 * Currently matches the default of `stripe@22.3.0`, so this pin is a no-op
 * against today's behaviour — it only takes effect on a future SDK upgrade.
 *
 * To move it: bump this constant, then re-read the Stripe API changelog for
 * every version crossed before merging.
 * https://docs.stripe.com/upgrades
 */
export const STRIPE_API_VERSION = '2026-06-24.dahlia' as const;
