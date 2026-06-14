// Agent Registry - All 10 CCVS Agents
import { MutationTestAgent } from './mutation-test-agent';
import { PropertyTestAgent } from './property-test-agent';
import { ContractTestAgent } from './contract-test-agent';
import { IntegrationTestAgent } from './integration-test-agent';
import { AdversarialTestAgent } from './adversarial-test-agent';
import { Z3VerificationAgent } from './z3-verification-agent';
import { ProvenanceAgent } from './provenance-agent';
import { DeploymentAttestationAgent } from './deployment-attestation-agent';

export const AGENTS = [
  new MutationTestAgent(),
  new PropertyTestAgent(),
  new ContractTestAgent(),
  new IntegrationTestAgent(),
  new AdversarialTestAgent(),
  new Z3VerificationAgent(),
  new ProvenanceAgent(),
  new DeploymentAttestationAgent()
];

export const AGENTS_BY_LEVEL = {
  L1: [
    new MutationTestAgent(),
    new PropertyTestAgent()
  ],
  L2: [
    new ContractTestAgent(),
    new IntegrationTestAgent()
  ],
  L3: [
    new AdversarialTestAgent()
  ],
  L4: [
    new Z3VerificationAgent()
  ],
  L5: [
    new ProvenanceAgent(),
    new DeploymentAttestationAgent()
  ]
};

export const AGENTS_BY_GROUP = {
  'L1-unit': [
    new MutationTestAgent(),
    new PropertyTestAgent()
  ],
  'L2-integration': [
    new ContractTestAgent(),
    new IntegrationTestAgent()
  ],
  'L3-adversarial': [
    new AdversarialTestAgent()
  ],
  'L4-formal': [
    new Z3VerificationAgent()
  ],
  'L5-provenance': [
    new ProvenanceAgent(),
    new DeploymentAttestationAgent()
  ]
};

export function getAgent(id: string): any {
  return AGENTS.find(a => a.id === id);
}

export function getAgentsByLevel(level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'): any[] {
  return AGENTS_BY_LEVEL[level];
}

export function getAgentsByGroup(group: string): any[] {
  return AGENTS_BY_GROUP[group];
}

export function getExecutionOrder(): string[][] {
  // Returns parallel groups in dependency order
  return [
    ['L1-unit'],
    ['L2-integration'],
    ['L3-adversarial'],
    ['L4-formal'],
    ['L5-provenance']
  ];
}