export * from './types';
export { DeterministicRng, createRng } from './deterministic-rng';
export {
  DEFAULT_PENALTY,
  DEFAULT_SLACK_GRANULARITY,
  buildQuboMatrix,
  isingEnergy,
  quboEnergy,
  slackWeights,
  toBits,
  toIsingModel,
  toSpins,
} from './matrix';
export { assertConstraintsResolve, constraintScope, verifyConstraints } from './constraints';
export { PROVENANCE_CHAIN_ROOT, SOLVER_VERSION, replayProvenance, solveQubo } from './annealer';
export {
  DEFAULT_CATALOG_WEIGHTING,
  catalogFrameworks,
  controlsFromCatalog,
  type CatalogWeighting,
} from './catalog-adapter';
export { runWhatIf, type WhatIfOutcome, type WhatIfReport, type WhatIfScenario } from './what-if';
