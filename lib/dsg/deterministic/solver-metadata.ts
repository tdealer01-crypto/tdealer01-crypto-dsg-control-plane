import type { DeterministicSolverName } from './types';

export type DeterministicSolverMetadata = {
  name: DeterministicSolverName;
  version: string;
  externalSolverInvoked: boolean;
};

export function getDeterministicSolverMetadata(): DeterministicSolverMetadata {
  const configuredName = process.env.DSG_DETERMINISTIC_SOLVER_NAME?.trim() as DeterministicSolverName | undefined;
  const configuredVersion = process.env.DSG_DETERMINISTIC_SOLVER_VERSION?.trim();
  const externalSolverInvoked = process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_INVOKED === 'true';

  return {
    name: configuredName || 'static_check',
    version: configuredVersion || `dsg-deterministic-ts-${process.env.npm_package_version || '0.0.0'}`,
    externalSolverInvoked,
  };
}
