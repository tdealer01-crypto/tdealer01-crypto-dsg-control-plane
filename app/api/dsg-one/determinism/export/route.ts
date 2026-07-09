/**
 * GET /api/dsg-one/determinism/export?format=json|sarif
 *
 * Exports complete determinism ledger for audit compliance.
 * - JSON format: Raw ledger with Merkle tree structure
 * - SARIF format: Standard audit format that auditors understand
 *
 * Enterprise use case:
 * - Download ledger
 * - Import into internal audit/compliance systems
 * - Verify all decisions with Merkle proofs
 * - Prove no tampering occurred
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { buildMerkleTree, exportLedgerAsJSON, exportLedgerAsSARIF } from '@/lib/dsg-one/merkle-ledger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const orgId = url.searchParams.get('org_id');
    const limit = parseInt(url.searchParams.get('limit') || '10000', 10);

    if (!orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_ORG_ID',
          details: 'Please provide org_id query parameter',
        },
        { status: 400 }
      );
    }

    // Validate format
    if (!['json', 'sarif'].includes(format)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_FORMAT',
          details: 'Format must be "json" or "sarif"',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin() as any;

    // Fetch determinism ledger entries
    const { data: entries, error } = await supabase
      .from('dsg_determinism_ledger')
      .select('*')
      .eq('org_id', orgId)
      .order('sequence_number', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`LEDGER_FETCH_FAILED:${error.message}`);
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_LEDGER_ENTRIES',
          details: `No determinism ledger entries found for org ${orgId}`,
        },
        { status: 404 }
      );
    }

    // Build Merkle tree to get root hash
    const { rootHash } = buildMerkleTree(
      entries.map((e: any) => ({
        sequenceNumber: BigInt(e.sequence_number),
        entryId: e.entry_id,
        requestHash: e.request_hash,
        decisionHash: e.decision_hash,
        chainHash: e.chain_hash,
        timestamp: e.created_at,
        verified: e.verified,
      }))
    );

    // Transform database entries to export format
    const transformedEntries = entries.map((e: any) => ({
      sequenceNumber: BigInt(e.sequence_number),
      entryId: e.entry_id,
      requestHash: e.request_hash,
      decisionHash: e.decision_hash,
      chainHash: e.chain_hash,
      timestamp: e.created_at,
      verified: e.verified,
      decisionOutcome: e.decision_outcome,
      decisionReason: e.decision_reason,
      riskScore: e.risk_score,
    }));

    // Generate export based on format
    let exportContent: string;
    let contentType: string;
    let filename: string;

    if (format === 'sarif') {
      const sarifObj = exportLedgerAsSARIF(orgId, transformedEntries, rootHash);
      exportContent = JSON.stringify(sarifObj, null, 2);
      contentType = 'application/sarif+json';
      filename = `dsg-ledger-${orgId}-${new Date().toISOString().split('T')[0]}.sarif.json`;
    } else {
      exportContent = exportLedgerAsJSON(orgId, transformedEntries);
      contentType = 'application/json';
      filename = `dsg-ledger-${orgId}-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Return file download
    return new NextResponse(exportContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Merkle-Root-Hash': rootHash,
        'X-Total-Entries': String(entries.length),
      },
    });
  } catch (error) {
    console.error('GET /api/dsg-one/determinism/export failed:', error instanceof Error ? error.stack : error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to export determinism evidence',
      },
      { status: 500 }
    );
  }
}
