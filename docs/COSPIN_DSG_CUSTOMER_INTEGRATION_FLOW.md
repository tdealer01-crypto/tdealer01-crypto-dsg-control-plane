# CospinDSG Customer Integration Flow

## Goal

Make the first customer integration simple:

> One existing agent -> one protected action -> one decision -> one evidence trail.

## Integration modes

### 1. Shadow Mode

CospinDSG observes and records action decisions but does not block the customer system yet.

Use this first when the customer is afraid of disruption.

### 2. Review Mode

CospinDSG allows low-risk actions and requires review for higher-risk actions.

### 3. Enforce Mode

CospinDSG blocks unsafe actions before they reach real-world execution.

## Minimal customer wrapper

```ts
async function guardedAction(actionPayload: {
  action: string;
  input: unknown;
  context: Record<string, unknown>;
  targetSystem: string;
  riskLevel: string;
}) {
  const memoryPacket = {
    memoryId: crypto.randomUUID(),
    sourceSystem: 'customer-agent',
    snapshotHash: await sha256(actionPayload.context),
    dataClassification: 'internal',
    ttlSeconds: 600,
    context: actionPayload.context,
  };

  const dsgPayload = {
    agent_id: 'customer-agent-1',
    action: actionPayload.action,
    input: actionPayload.input,
    context: {
      memory_packet: memoryPacket,
      target_system: actionPayload.targetSystem,
      risk_level: actionPayload.riskLevel,
    },
  };

  await fetch(`${DSG_BASE_URL}/api/intent`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${DSG_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(dsgPayload),
  });

  const decision = await fetch(`${DSG_BASE_URL}/api/execute`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${DSG_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(dsgPayload),
  }).then((response) => response.json());

  if (decision.decision !== 'ALLOW') {
    return {
      blocked: true,
      decision,
    };
  }

  const result = await existingCustomerAgent.execute(actionPayload);

  await fetch(`${DSG_BASE_URL}/api/dsg/commit`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${DSG_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      request_id: decision.request_id,
      result_receipt_hash: await sha256(result),
      target_system_receipt_id: result.receiptId,
    }),
  });

  return result;
}
```

## First implementation target

Start with one protected action where blocking is obviously valuable:

- payment creation
- privilege change
- external data write
- irreversible workflow transition
- production deployment

## Customer-facing acceptance criteria

A first customer pilot passes when:

1. The customer can keep their current agent runtime.
2. The customer can wrap one action in less than one day.
3. Every protected action returns a decision.
4. Every non-ALLOW decision includes a reason.
5. Every result receipt is tied to the original action envelope.
6. The customer can show an evidence trail to a reviewer.

## Safety claim boundary

Do not claim that CospinDSG guarantees perfect safety. The correct claim is narrower:

> CospinDSG creates a deterministic gate and evidence trail before protected actions execute.

## Sales demo script

1. Show the customer's current agent flow.
2. Insert CospinDSG before one action.
3. Run one safe action and show `ALLOW`.
4. Run one risky action and show `STABILIZE` or `BLOCK`.
5. Open the evidence trail.
6. Explain what changed: the customer did not replace their agent; they added a runtime gate.
