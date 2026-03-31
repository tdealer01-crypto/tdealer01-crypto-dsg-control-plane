import { canonicalHash } from './canonical';

export function buildCheckpointHash(input: {
  truthCanonicalHash: string;
  latestLedgerId: string;
  latestLedgerSequence: number;
  latestTruthSequence: number;
}) {
  return canonicalHash({
    truth_hash: input.truthCanonicalHash,
    latest_ledger_id: input.latestLedgerId,
    ledger_sequence: input.latestLedgerSequence,
    truth_sequence: input.latestTruthSequence,
  });
}
