/**
 * Constructs Barrel Export
 *
 * Export all CDK constructs for DSG ONE infrastructure
 */

// Phase 1: Foundation
export { NetworkingConstruct } from './networking';
export { IAMConstruct } from './iam';
export { KMSConstruct } from './kms';
export { SecretsConstruct } from './secrets';
export { ECRConstruct } from './ecr';
export { GovernanceConstruct } from './governance';

// Phase 2: Compute & Observability
export { ALBConstruct } from './alb';
export { ECSConstruct } from './ecs';
export { CloudWatchConstruct } from './cloudwatch';
export { CloudTrailConstruct } from './cloudtrail';
export { XRayConstruct } from './xray';
export { AutoScalingConstruct } from './autoscaling';

// Phase 3: AI Governance Layer
export { PolicyEngineConstruct } from './policy-engine';
export { ModelRegistryConstruct } from './model-registry';
export { AuditConstruct } from './audit';
export { ReplayConstruct } from './replay';
export { EvidenceConstruct } from './evidence';
export { ComplianceConstruct } from './compliance';
export { FeatureFlagsConstruct } from './feature-flags';

// Phase 4: Security & Operations
export { Route53Construct } from './route53';
export { ACMConstruct } from './acm';
export { GuardDutyConstruct } from './guardduty';
export { SecurityHubConstruct } from './securityhub';
export { WAFConstruct } from './waf';
export { ShieldConstruct } from './shield';
export { InspectorConstruct } from './inspector';
export { BackupConstruct } from './backup';
export { SNSConstruct } from './sns';
export { FinOpsConstruct } from './finops';
export { MultiRegionConstruct } from './multi-region';
