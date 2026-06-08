import { chargeToGatewayRequest } from '../adapters/stripe-to-dsg-gate';
import { evaluateGateway } from '../lib/dsg-client';

export interface CustomUIActionRequest {
  action: 'approve' | 'block' | 'review';
  stripe_account_id: string;
  operation_type: 'charge' | 'payment_intent' | 'payout';
  object_id: string;
  amount_cents: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface CustomUIActionResponse {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
  proof?: string;
  should_proceed: boolean;
}

export async function evaluateCustomUIAction(
  request: CustomUIActionRequest,
  dsgApiBase: string
): Promise<CustomUIActionResponse> {
  // Pre-execution gate - user clicked action button in Stripe Dashboard
  // Must decide within <2 seconds before Dashboard times out

  const gatewayRequest = {
    action: `stripe.${request.operation_type}.ui_action`,
    operation_type: request.operation_type,
    context: {
      stripe_account_id: request.stripe_account_id,
      stripe_event_id: `ui_action_${Date.now()}`,
      object_type: request.operation_type as 'charge' | 'payment_intent' | 'payout',
      object_id: request.object_id,
      amount_cents: request.amount_cents,
      currency: request.currency,
      metadata: request.metadata,
    },
  };

  const decision = await evaluateGateway(gatewayRequest, dsgApiBase);

  return {
    decision: decision.decision,
    reason: decision.reason,
    proof: decision.proof,
    should_proceed: decision.decision === 'ALLOW',
  };
}
