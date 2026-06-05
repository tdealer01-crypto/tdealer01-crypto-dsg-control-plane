import type { SkillDraft, SkillInspection, SkillVerificationResult } from './types';

export function verifySkill(
  draft: SkillDraft,
  inspection: SkillInspection,
): SkillVerificationResult {
  const reasons: string[] = [];

  if (!inspection.hasReadme) reasons.push('MISSING_README');
  if (!inspection.hasLicense) reasons.push('MISSING_LICENSE');
  if (!inspection.hasTests) reasons.push('NO_TESTS_FOUND');
  if (inspection.hasSecretHardcoded) reasons.push('HARDCODED_SECRET_DETECTED');
  if (inspection.hasExternalWrite) reasons.push('EXTERNAL_WRITE_CAPABILITY');
  if (inspection.hasCodeExecution) reasons.push('CODE_EXECUTION_CAPABILITY');

  let status: SkillVerificationResult['status'];

  if (inspection.hasSecretHardcoded) {
    status = 'blocked';
  } else if (inspection.hasCodeExecution || inspection.hasExternalWrite) {
    status = 'needs_approval';
  } else if (!inspection.hasReadme || !inspection.hasLicense || !inspection.hasTests) {
    status = 'needs_review';
  } else {
    status = 'verified';
  }

  return {
    status,
    reasons,
    checks: {
      hasReadme: inspection.hasReadme,
      hasLicense: inspection.hasLicense,
      hasTests: inspection.hasTests,
      noHardcodedSecrets: !inspection.hasSecretHardcoded,
      noExternalWrite: !inspection.hasExternalWrite,
      noCodeExecution: !inspection.hasCodeExecution,
      riskLevel: draft.riskLevel,
    },
  };
}
