# @dsg/sdk (workspace draft)

Lightweight TypeScript client for DSG Control Plane integrations.

## Usage

```ts
import { DSGClient } from '@dsg/sdk';

const dsg = new DSGClient({
  baseUrl: 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
  apiKey: process.env.DSG_API_KEY!,
  agentId: process.env.DSG_AGENT_ID!,
});

const result = await dsg.execute('approve_invoice', {
  invoice_id: 'INV-001',
  amount: 50_000,
});

if (result.decision === 'ALLOW') {
  await dsg.callback(result.execution_id, 'succeeded');
}
```

## Notes

- `execute` maps to `POST /api/execute`.
- `callback` maps to `POST /api/effect-callback` and requires org-auth cookie in production.
