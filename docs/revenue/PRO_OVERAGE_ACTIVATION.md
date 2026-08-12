# DSG Pro Overage Activation Contract

## Current production rule

DSG Pro is a fixed **$99/month** subscription with **5,000 included evaluations**. Evaluation 5,001 and later must not be delivered as billable overage unless the complete Stripe usage-billing contract has been verified.

The repository-defined overage rate is **USD 0.001 per execution** and the meter event name is `dsg_execution_overage`.

## Required production configuration

All four values must exist before overage is considered active:

```env
STRIPE_SECRET_KEY=<live-secret-in-secret-store>
STRIPE_METER_EVENT_NAME=dsg_execution_overage
STRIPE_METER_ID=<verified Stripe Billing Meter id>
STRIPE_PRICE_PRO_OVERAGE=<verified recurring metered Price id>
```

`STRIPE_PRICE_PRO_MONTHLY` remains the fixed $99/month base price.

## Checkout contract

When the full meter contract is configured, a new Pro Checkout subscription contains:

1. the fixed Pro monthly Price with quantity `1`; and
2. the metered overage Price with **no fixed quantity**.

Enterprise remains unlimited and does not receive the Pro overage item.

If any required meter setting is missing, Checkout can still sell the fixed Pro subscription, but DSG reports metered billing as not configured and the entitlement layer must fail closed once the included quota is exhausted.

## Meter-event contract

For authorized Pro overage, DSG first persists an idempotent `billing_meter_outbox` row and then sends a Stripe Billing Meter event using the configured event name. The execution id is the meter-event idempotency key.

A Stripe API delivery failure can be retried from the durable outbox. If DSG cannot create durable billing evidence, the paid output must be withheld.

## Truth boundary

Do not claim Pro overage is live merely because `STRIPE_METER_EVENT_NAME` is set or because the application can call Stripe's Meter Event API. Overage is live only after:

- a real Stripe Billing Meter exists;
- a real metered recurring Price linked to that meter exists;
- `STRIPE_METER_ID` and `STRIPE_PRICE_PRO_OVERAGE` are configured in production;
- Pro Checkout is verified to contain both subscription items; and
- a controlled real usage event is observed on a real Stripe invoice/subscription.

Until then, the correct status is **fixed subscription live; overage fail-closed**.
