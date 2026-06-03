/**
 * Hermes Evidence Reporter
 *
 * Collects evidence items from worker output and submits
 * a HermesEvidenceReceipt to the DSG audit endpoint.
 */

import { createHash } from "crypto";
import type { DsgPlanAlignmentResult, HermesEvidenceReceipt } from "@/lib/dsg/plan-scope-contract";
import type { HermesPlanScopeContract } from "@/lib/dsg/plan-scope-contract";
import type { HermesActionEvent } from "@/lib/dsg/plan-scope-contract";
import { buildHermesEvidenceReceipt } from "@/lib/dsg/plan-alignment-gate";

export type EvidenceType =
  | "diff"
  | "command_output"
  | "test_result"
  | "build_result"
  | "screenshot"
  | "api_response"
  | "deployment_proof"
  | "db_receipt"
  | "file_hash"
  | "schema_hash"
  | "source_citations"
  | "action_log";

export type EvidenceItem = {
  type: EvidenceType;
  content: string;
  hash: string;
  summary: string;
};

export function buildEvidenceItem(
  type: EvidenceType,
  content: string,
  summary: string,
): EvidenceItem {
  return {
    type,
    content,
    hash: sha256(content),
    summary,
  };
}

export function buildResultHash(items: EvidenceItem[]): string {
  return sha256(items.map((i) => i.hash).join(":"));
}

export function buildEvidenceReceipt(
  contract: HermesPlanScopeContract,
  event: HermesActionEvent,
  alignment: DsgPlanAlignmentResult,
  items: EvidenceItem[],
  opts: {
    commandId?: string;
    envelopeId?: string;
    success: boolean;
    claimVerified?: boolean;
  },
): HermesEvidenceReceipt {
  return buildHermesEvidenceReceipt(contract, event, alignment, {
    commandId: opts.commandId,
    envelopeId: opts.envelopeId,
    actionStatus: opts.success ? "SUCCESS" : "FAILED",
    observedResultHash: buildResultHash(items),
    evidenceItemIds: items.map((i) => i.hash.slice(0, 16)),
    claimVerified: opts.claimVerified ?? (opts.success && items.length > 0),
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
