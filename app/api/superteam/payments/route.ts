import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PaymentRequest {
  submissionId: string;
  bountyId: string;
  userId: string;
  amount: number;
  walletAddress?: string;
  paymentMethod: 'stripe' | 'crypto';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PaymentRequest;
    const { submissionId, bountyId, userId, amount, paymentMethod, walletAddress } = body;

    if (!submissionId || !bountyId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify submission exists and is approved
    const { data: submission, error: fetchError } = await supabase
      .from('bounty_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('dsg_gate_status', 'approved')
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found or not approved', details: fetchError },
        { status: 404 }
      );
    }

    if (paymentMethod === 'stripe') {
      // Create Stripe payment intent
      try {
        const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: Math.round(amount * 100).toString(),
            currency: 'usd',
            metadata: JSON.stringify({
              submissionId,
              bountyId,
              userId,
              type: 'bounty_reward',
            }),
          }).toString(),
        });

        if (!stripeResponse.ok) {
          throw new Error(`Stripe error: ${stripeResponse.statusText}`);
        }

        const paymentIntent = await stripeResponse.json();

        // Update submission with payment info
        await supabase
          .from('bounty_submissions')
          .update({
            payment_status: 'pending',
            payment_tx_hash: paymentIntent.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        return NextResponse.json({
          success: true,
          paymentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error('Stripe error:', error);
        return NextResponse.json(
          { error: 'Failed to create payment', details: String(error) },
          { status: 500 }
        );
      }
    } else if (paymentMethod === 'crypto') {
      // Handle crypto payment (placeholder for Web3 integration)
      if (!walletAddress) {
        return NextResponse.json(
          { error: 'Wallet address required for crypto payment' },
          { status: 400 }
        );
      }

      // TODO: Implement actual crypto transfer
      // For now, just mark as paid
      const txHash = `0x${Math.random().toString(16).slice(2)}`;

      await supabase
        .from('bounty_submissions')
        .update({
          payment_status: 'paid',
          payment_tx_hash: txHash,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      return NextResponse.json({
        success: true,
        paymentId: txHash,
        walletAddress,
        amount,
        message: '⏳ Crypto payment processing (test mode)',
      });
    }

    return NextResponse.json(
      { error: 'Invalid payment method' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: 'Payment failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submissionId required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: submission, error } = await supabase
      .from('bounty_submissions')
      .select('payment_status, payment_tx_hash, paid_at')
      .eq('id', submissionId)
      .single();

    if (error || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentStatus: submission.payment_status,
      paymentTxHash: submission.payment_tx_hash,
      paidAt: submission.paid_at,
    });
  } catch (error) {
    console.error('Error checking payment:', error);
    return NextResponse.json(
      { error: 'Failed to check payment', details: String(error) },
      { status: 500 }
    );
  }
}
