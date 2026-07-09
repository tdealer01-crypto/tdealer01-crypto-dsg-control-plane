/**
 * DSG ONE Merkle Tree Ledger
 *
 * Immutable Merkle tree structure for audit-ready ledger exports.
 * Allows auditors to:
 * - Verify entire ledger integrity in O(log N) time
 * - Generate compact Merkle proofs for individual decisions
 * - Export SARIF-formatted evidence for compliance
 * - Replay decisions offline
 */

import { sha256Json, sha256Text } from '@/lib/dsg/runtime/hash';
import { stableJsonStringify } from '@/lib/dsg/runtime/stable-json';

/**
 * Merkle tree leaf node (individual ledger entry)
 */
export interface MerkleLeaf {
  leafHash: string; // SHA-256 of the entry
  sequenceNumber: bigint;
  entryId: string;
  timestamp: string;
}

/**
 * Merkle tree branch node (combines two child nodes)
 */
export interface MerkleBranch {
  nodeHash: string; // SHA-256(left || right)
  leftHash: string;
  rightHash: string;
  leafCount: number;
}

/**
 * Merkle proof for a single entry (path from leaf to root)
 */
export interface MerkleProof {
  leafHash: string;
  leafIndex: number;
  proofPath: Array<{
    hash: string;
    direction: 'left' | 'right';
  }>;
  rootHash: string;
}

/**
 * Compute hash of a ledger entry
 */
export function hashLedgerEntry(entry: {
  sequenceNumber: bigint;
  entryId: string;
  requestHash: string;
  decisionHash: string;
  chainHash: string;
  timestamp: string;
  verified: boolean;
}): string {
  return sha256Json({
    sequenceNumber: entry.sequenceNumber.toString(),
    entryId: entry.entryId,
    requestHash: entry.requestHash,
    decisionHash: entry.decisionHash,
    chainHash: entry.chainHash,
    timestamp: entry.timestamp,
    verified: entry.verified,
  });
}

/**
 * Compute hash of two Merkle nodes (concatenate and hash)
 */
export function combineHashes(leftHash: string, rightHash: string): string {
  // Extract hex from "sha256:..." format
  const leftHex = leftHash.replace('sha256:', '');
  const rightHex = rightHash.replace('sha256:', '');
  // Concatenate and hash
  return sha256Text(leftHex + rightHex);
}

/**
 * Build a Merkle tree from ledger entries
 * @param entries Sorted ledger entries
 * @returns { rootHash: string, tree: MerkleBranch[] }
 */
export function buildMerkleTree(
  entries: Array<{
    sequenceNumber: bigint;
    entryId: string;
    requestHash: string;
    decisionHash: string;
    chainHash: string;
    timestamp: string;
    verified: boolean;
  }>
): { rootHash: string; tree: MerkleBranch[] } {
  if (entries.length === 0) {
    return {
      rootHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      tree: [],
    };
  }

  // Create leaf hashes
  const leaves: string[] = entries.map((e) => hashLedgerEntry(e));

  // Build tree bottom-up
  let currentLevel = leaves;
  const branches: MerkleBranch[] = [];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const leftHash = currentLevel[i];
      const rightHash = currentLevel[i + 1] || leftHash; // Use left if odd number

      const combinedHash = combineHashes(leftHash, rightHash);
      nextLevel.push(combinedHash);

      branches.push({
        nodeHash: combinedHash,
        leftHash,
        rightHash,
        leafCount: 1,
      });
    }

    currentLevel = nextLevel;
  }

  return {
    rootHash: currentLevel[0],
    tree: branches,
  };
}

/**
 * Generate Merkle proof for a single entry
 * Proof allows verification that entry is part of tree without revealing all entries
 */
export function generateMerkleProof(
  entries: Array<{
    sequenceNumber: bigint;
    entryId: string;
    requestHash: string;
    decisionHash: string;
    chainHash: string;
    timestamp: string;
    verified: boolean;
  }>,
  targetEntryId: string
): MerkleProof | null {
  const leafIndex = entries.findIndex((e) => e.entryId === targetEntryId);
  if (leafIndex === -1) return null;

  const { rootHash } = buildMerkleTree(entries);

  // Compute leaf hash
  const leafHash = hashLedgerEntry(entries[leafIndex]);

  // Build proof path
  const proofPath: Array<{ hash: string; direction: 'left' | 'right' }> = [];

  let currentLevel = entries.map((e) => hashLedgerEntry(e));
  let currentIndex = leafIndex;

  while (currentLevel.length > 1) {
    const isLeft = currentIndex % 2 === 0;
    const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
    const siblingHash = currentLevel[siblingIndex] || currentLevel[currentIndex];

    proofPath.push({
      hash: siblingHash,
      direction: isLeft ? 'right' : 'left',
    });

    // Compute next level (combine pairs of hashes)
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const leftHash = currentLevel[i];
      const rightHash = currentLevel[i + 1] || leftHash;
      nextLevel.push(combineHashes(leftHash, rightHash));
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leafHash,
    leafIndex,
    proofPath,
    rootHash,
  };
}

/**
 * Verify a Merkle proof
 * @param proof Merkle proof from generateMerkleProof
 * @returns true if proof is valid
 */
export function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.leafHash;

  for (const step of proof.proofPath) {
    if (step.direction === 'left') {
      currentHash = combineHashes(step.hash, currentHash);
    } else {
      currentHash = combineHashes(currentHash, step.hash);
    }
  }

  return currentHash === proof.rootHash;
}

/**
 * Export ledger as SARIF (Static Analysis Results Interchange Format)
 * Standard format that auditors and compliance tools understand
 * @param orgId Organization ID
 * @param entries Ledger entries
 * @param rootHash Merkle root hash
 * @returns SARIF JSON object
 */
export function exportLedgerAsSARIF(
  orgId: string,
  entries: Array<{
    sequenceNumber: bigint;
    entryId: string;
    requestHash: string;
    decisionHash: string;
    chainHash: string;
    timestamp: string;
    verified: boolean;
    decisionOutcome: string;
    decisionReason: string;
    riskScore?: number;
  }>,
  rootHash: string
): object {
  return {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'DSG ONE Governance Engine',
            version: '1.0.0',
            organization: 'dsg.pics',
            semanticVersion: '1.0.0',
            informationUri: 'https://dsg.pics',
            supportedConfigurationKinds: ['governance', 'policy', 'compliance'],
            properties: {
              merkleRootHash: rootHash,
              ledgerFormat: 'deterministic-chain',
              chainVerified: entries.every((e) => e.verified),
            },
          },
        },
        results: entries.map((entry) => ({
          ruleId: 'POLICY_EXECUTION',
          message: {
            text: `Policy decision: ${entry.decisionOutcome}`,
            markdown: `**Decision**: ${entry.decisionOutcome}\n**Reason**: ${entry.decisionReason}\n**Risk**: ${entry.riskScore ?? 'N/A'}`,
          },
          kind: 'pass',
          level: entry.decisionOutcome === 'BLOCK' ? 'warning' : 'note',
          locations: [
            {
              physicalLocation: {
                address: {
                  relativeAddress: Number(entry.sequenceNumber),
                },
                region: {
                  startLine: Number(entry.sequenceNumber),
                },
              },
              logicalLocations: [
                {
                  name: `Sequence #${entry.sequenceNumber}`,
                  parentIndex: -1,
                  kind: 'policy-execution',
                },
              ],
            },
          ],
          properties: {
            entryId: entry.entryId,
            sequenceNumber: entry.sequenceNumber.toString(),
            requestHash: entry.requestHash,
            decisionHash: entry.decisionHash,
            chainHash: entry.chainHash,
            timestamp: entry.timestamp,
            verified: entry.verified,
            deterministic: true,
          },
        })),
        properties: {
          orgId,
          generatedAt: new Date().toISOString(),
          format: 'DSG-LEDGER-EXPORT-1.0',
          totalEntries: entries.length,
        },
      },
    ],
  };
}

/**
 * Export ledger as JSON with Merkle tree structure
 * Can be imported into auditor tools or compliance systems
 */
export function exportLedgerAsJSON(
  orgId: string,
  entries: Array<{
    sequenceNumber: bigint;
    entryId: string;
    requestHash: string;
    decisionHash: string;
    chainHash: string;
    timestamp: string;
    verified: boolean;
    decisionOutcome: string;
    decisionReason: string;
    riskScore?: number;
  }>
): string {
  const { rootHash } = buildMerkleTree(
    entries.map((e) => ({
      sequenceNumber: e.sequenceNumber,
      entryId: e.entryId,
      requestHash: e.requestHash,
      decisionHash: e.decisionHash,
      chainHash: e.chainHash,
      timestamp: e.timestamp,
      verified: e.verified,
    }))
  );

  return stableJsonStringify({
    version: '1.0.0',
    format: 'DSG-DETERMINISM-LEDGER',
    generatedAt: new Date().toISOString(),
    orgId,
    merkleRootHash: rootHash,
    totalEntries: entries.length,
    entries: entries.map((e) => ({
      sequenceNumber: e.sequenceNumber.toString(),
      entryId: e.entryId,
      requestHash: e.requestHash,
      decisionHash: e.decisionHash,
      chainHash: e.chainHash,
      timestamp: e.timestamp,
      verified: e.verified,
      decision: {
        outcome: e.decisionOutcome,
        reason: e.decisionReason,
        riskScore: e.riskScore,
      },
    })),
  });
}
