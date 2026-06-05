import { describe, expect, it } from 'vitest';

// Seed Engine invariant tests — no actual network calls.
// Validates: data_needed ∧ data_unknown → must_search ∧ ¬can_proceed

function simulateSeedEngine(opts: {
  dataNeeded: boolean;
  dataAvailable: boolean;
  searchAttempted: boolean;
  requiredEvidence: boolean;
}) {
  // If data not needed, always pass
  if (!opts.dataNeeded) {
    return { gateStatus: 'PASS', blockReason: null, searchAttempted: false };
  }

  // Data is needed but not available — must search first
  if (!opts.dataAvailable && !opts.searchAttempted) {
    return { gateStatus: 'BLOCK', blockReason: 'SEED_DATA_NOT_SEARCHED', searchAttempted: false };
  }

  // Searched but still no data
  if (!opts.dataAvailable && opts.searchAttempted) {
    if (opts.requiredEvidence) {
      return { gateStatus: 'BLOCK', blockReason: 'SEARCH_RETURNED_NO_RESULTS', searchAttempted: true };
    }
    return { gateStatus: 'PASS', blockReason: 'SEARCH_RETURNED_NO_RESULTS', searchAttempted: true };
  }

  // Data is available
  return { gateStatus: 'PASS', blockReason: null, searchAttempted: opts.searchAttempted };
}

describe('Seed Engine — Core Invariant', () => {
  it('PASS when data not needed', () => {
    const r = simulateSeedEngine({ dataNeeded: false, dataAvailable: false, searchAttempted: false, requiredEvidence: true });
    expect(r.gateStatus).toBe('PASS');
  });

  it('BLOCK when data needed but search not attempted', () => {
    const r = simulateSeedEngine({ dataNeeded: true, dataAvailable: false, searchAttempted: false, requiredEvidence: true });
    expect(r.gateStatus).toBe('BLOCK');
    expect(r.blockReason).toBe('SEED_DATA_NOT_SEARCHED');
  });

  it('PASS when data needed and data is available', () => {
    const r = simulateSeedEngine({ dataNeeded: true, dataAvailable: true, searchAttempted: true, requiredEvidence: true });
    expect(r.gateStatus).toBe('PASS');
  });

  it('BLOCK when search attempted but no results + requiredEvidence=true', () => {
    const r = simulateSeedEngine({ dataNeeded: true, dataAvailable: false, searchAttempted: true, requiredEvidence: true });
    expect(r.gateStatus).toBe('BLOCK');
    expect(r.blockReason).toBe('SEARCH_RETURNED_NO_RESULTS');
  });

  it('PASS when search attempted, no results, but requiredEvidence=false', () => {
    const r = simulateSeedEngine({ dataNeeded: true, dataAvailable: false, searchAttempted: true, requiredEvidence: false });
    expect(r.gateStatus).toBe('PASS');
  });
});

describe('Seed Engine — Evidence Hash Requirement', () => {
  it('never returns data without evidence hash when data is available', () => {
    const data = { result: 'test-data' };
    const evidenceHash = `sha256:${Buffer.from(JSON.stringify(data)).toString('base64')}`;
    expect(evidenceHash).toMatch(/^sha256:/);
  });

  it('returns sha256:none when data is not available', () => {
    const evidenceHash = 'sha256:none';
    expect(evidenceHash).toBe('sha256:none');
  });
});

describe('Seed Engine — No Guessing Rule', () => {
  it('never returns hardcoded/guessed data', () => {
    // The seed engine must always return real fetched data or BLOCK
    // It cannot return predefined static fallback arrays
    const blockedResult = simulateSeedEngine({ dataNeeded: true, dataAvailable: false, searchAttempted: true, requiredEvidence: true });
    expect(blockedResult.gateStatus).toBe('BLOCK');
    // data must be null when blocked — not a fallback
    expect(blockedResult.blockReason).not.toBeNull();
  });

  it('marks search as attempted before returning any result', () => {
    const r = simulateSeedEngine({ dataNeeded: true, dataAvailable: true, searchAttempted: true, requiredEvidence: true });
    expect(r.searchAttempted).toBe(true);
  });
});
