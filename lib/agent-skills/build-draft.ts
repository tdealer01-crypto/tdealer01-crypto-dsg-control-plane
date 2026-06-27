import type { SkillDraft, SkillInspection, SkillPermissions, SkillRiskLevel } from './types';

function assessRisk(inspection: SkillInspection): SkillRiskLevel {
  if (inspection.hasSecretHardcoded) return 'critical';
  if (inspection.hasCodeExecution && inspection.hasExternalWrite) return 'high';
  if (inspection.hasCodeExecution || inspection.hasExternalWrite) return 'medium';
  if (!inspection.hasReadme || !inspection.hasLicense) return 'medium';
  return 'low';
}

function assessPermissions(inspection: SkillInspection): SkillPermissions {
  return {
    network: true,
    filesystem: inspection.hasCodeExecution ? 'read' : 'none',
    secrets: inspection.hasSecretHardcoded,
    codeExecution: inspection.hasCodeExecution,
    externalWrite: inspection.hasExternalWrite,
  };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function buildSkillDraft(inspection: SkillInspection): SkillDraft {
  const { source } = inspection;
  const id = slugify(source.fullName);
  const riskLevel = assessRisk(inspection);
  const permissions = assessPermissions(inspection);

  return {
    id,
    name: source.repo,
    sourceType: 'github',
    sourceUrl: source.url,
    sourceOwner: source.owner,
    sourceRepo: source.repo,
    description: source.description ?? `Open-source skill from ${source.fullName}`,
    status: 'draft',
    riskLevel,
    permissions,
    draftedAt: new Date().toISOString(),
  };
}
