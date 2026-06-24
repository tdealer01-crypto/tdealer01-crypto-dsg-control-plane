import { vi, test, expect } from 'vitest';

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: vi.fn(() => ({ id: 'evt_123', type: 'checkout.session.completed', data: { object: {} } })),
    },
  })),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve()),
      })),
      insert: vi.fn(() => Promise.resolve()),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    })),
  })),
}));

test('stripe mock works', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx';
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  const req = new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'valid_sig' },
    body: JSON.stringify({ type: 'checkout.session.completed' }),
  });
  const res = await POST(req);
  console.log('status', res.status);
  console.log('body', await res.text());
  expect(res.status).toBe(200);
});
