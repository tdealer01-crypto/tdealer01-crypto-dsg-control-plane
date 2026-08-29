import { EVIDENCE_SEVERITY } from '../../ccvs/evidence-collector';
import { REQUIREMENT_CATALOG, type RequirementControl } from '../../ccvs/compliance-matrix';
import type { PolicyControl } from './types';

/**
 * How a CCVS requirement's existing fields become QUBO decision weights.
 *
 * These are engineering weights over fields that already exist in
 * `REQUIREMENT_CATALOG` (`min_severity_level`, `evidence_type`,
 * `mutation_required`). They are a modelling choice for the optimiser, not a
 * legal, actuarial, or certification judgement, and callers are expected to
 * override them with their own numbers.
 */
export interface CatalogWeighting {
  /** Business value per unit of `min_severity_level`. */
  valuePerSeverity: number;
  /** Risk reduction per unit of `min_severity_level`. */
  riskPerSeverity: number;
  /** Cost per unit of the control's evidence-type severity. */
  costPerEvidenceSeverity: number;
  /** Extra cost when the requirement demands mutation testing. */
  mutationCost: number;
}

export const DEFAULT_CATALOG_WEIGHTING: CatalogWeighting = {
  valuePerSeverity: 2,
  riskPerSeverity: 3,
  costPerEvidenceSeverity: 1,
  mutationCost: 2,
};

/**
 * Build QUBO controls from the repository's own requirement catalog.
 *
 * Scope boundary: the catalog currently covers EU AI Act, ISO 42001,
 * NIST AI RMF, SLSA, and one DSG-internal requirement. It contains no GDPR,
 * PDPA, Thai criminal law, or FinTech rows, so this adapter cannot produce
 * controls for those frameworks; supply them explicitly as `PolicyControl[]`
 * if you need them.
 */
export function controlsFromCatalog(
  weighting: Partial<CatalogWeighting> = {},
  catalog: RequirementControl[] = REQUIREMENT_CATALOG,
): PolicyControl[] {
  const w: CatalogWeighting = { ...DEFAULT_CATALOG_WEIGHTING, ...weighting };
  return catalog.map((requirement) => ({
    id: requirement.requirement_id,
    label: requirement.title,
    framework: requirement.framework,
    value: requirement.min_severity_level * w.valuePerSeverity,
    riskReduction: requirement.min_severity_level * w.riskPerSeverity,
    cost:
      EVIDENCE_SEVERITY[requirement.evidence_type] * w.costPerEvidenceSeverity +
      (requirement.mutation_required ? w.mutationCost : 0),
  }));
}

/** Frameworks actually present in the catalog, for scope reporting. */
export function catalogFrameworks(
  catalog: RequirementControl[] = REQUIREMENT_CATALOG,
): string[] {
  return [...new Set(catalog.map((requirement) => requirement.framework))].sort();
}
