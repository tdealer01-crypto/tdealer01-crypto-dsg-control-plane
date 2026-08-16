import { NextResponse } from 'next/server';
import { applyRunEvent } from '@/lib/dsg-one/run/state-machine';
import { buildRunReceipt, replayRunReceipt } from '@/lib/dsg-one/run/receipt';
import { getRun, saveRun } from '@/lib/dsg-one/run/repository';
import { isTerminal } from '@/lib/dsg-one/run/types';
import { requireDsgAuth, dsgAuthError } from '@/lib/dsg/auth/require-dsg-auth';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dsg/v1/runs/:runId/receipt — Proof Receipt (product layer 5).
 *
 * Issues the receipt for a settled run, and replays it in the same call so the
 * caller never sees a receipt whose replay status is unknown. Replay is free
 * and unmetered: charging someone to check their own evidence would defeat the
 * point of issuing it.
 *
 * A CANCELLED run has no receipt — the user rejected the plan, so no work was
 * approved and there is nothing to prove.
 */
export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const { runId } = await params;

  try {
    const run = await getRun(runId, caller.orgId);
    if (!run) {
      return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 });
    }

    if (!isTerminal(run.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'run_not_settled',
          message: 'This run is still going. A receipt is issued once it finishes.',
          status: run.status,
        },
        { status: 409 },
      );
    }

    if (run.status === 'CANCELLED') {
      return NextResponse.json(
        {
          ok: false,
          error: 'run_cancelled',
          message: 'The plan was rejected, so nothing ran and there is nothing to prove.',
        },
        { status: 409 },
      );
    }

    const receipt = buildRunReceipt(run, new Date().toISOString());
    const replay = replayRunReceipt(receipt, run);

    // Record the receipt id on first issuance so Activity can link to it. The
    // id is derived from the chain, so re-issuing yields the same value.
    if (run.receiptId !== receipt.receiptId) {
      const stamped = applyRunEvent(run, {
        type: 'RECEIPT_ISSUED',
        receiptId: receipt.receiptId,
        at: receipt.issuedAt,
      });
      if (stamped.ok) await saveRun(stamped.run);
    }

    return NextResponse.json({ ok: true, receipt, replay });
  } catch (error) {
    return handleApiError('dsg-one/runs:receipt', error);
  }
}
