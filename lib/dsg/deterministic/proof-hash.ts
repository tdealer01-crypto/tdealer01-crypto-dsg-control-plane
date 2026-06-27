import { hashGatewayValue } from '../../gateway/audit';

export function hashDeterministicValue(value: unknown) {
  return hashGatewayValue(value);
}

export function buildConstraintSetHash(constraintIds: string[]) {
  return hashDeterministicValue({
    type: 'dsg-deterministic-constraint-set',
    version: '1.0',
    constraintIds: [...constraintIds].sort(),
  });
}

export function buildProofHash(input: {
  proofId: string;
  status: string;
  timestamp: string;
  solver: unknown;
  policyRef: string;
  policyVersion: string;
  constraintsChecked: number;
  inputHash: string;
  constraintSetHash: string;
  previousProofHash?: string;
  failureReasons: unknown[];
  constraints: unknown[];
}) {
  return hashDeterministicValue({
    type: 'dsg-deterministic-proof',
    version: '1.0',
    ...input,
  });
}
