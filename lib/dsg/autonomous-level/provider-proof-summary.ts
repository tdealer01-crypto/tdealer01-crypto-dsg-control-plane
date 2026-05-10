export type DsgProviderProofLaneSummary = {
  name: 'sandbox' | 'repair' | 'browser' | 'timeline' | 'preview';
  status: 'PASS';
};

export type DsgProviderProofSummary = {
  ok: boolean;
  claim: 'DSG_PROVIDER_PROOF_COMPLETE' | 'DSG_PROVIDER_PROOF_REQUIRED';
  proofHash: string;
  evidenceMode: 'safe-summary-only';
  rawArtifactPolicy: 'local-only';
  lanes: DsgProviderProofLaneSummary[];
  notes: string[];
};

export const DSG_PROVIDER_PROOF_SUMMARY: DsgProviderProofSummary = {
  ok: true,
  claim: 'DSG_PROVIDER_PROOF_COMPLETE',
  proofHash: '47c093d6088bae75e32877f73048eb8792f77212ff433743b78891219d0f995a',
  evidenceMode: 'safe-summary-only',
  rawArtifactPolicy: 'local-only',
  lanes: [
    { name: 'sandbox', status: 'PASS' },
    { name: 'repair', status: 'PASS' },
    { name: 'browser', status: 'PASS' },
    { name: 'timeline', status: 'PASS' },
    { name: 'preview', status: 'PASS' },
  ],
  notes: [
    'Raw provider proof bundle, screenshots, HTML bodies, and logs are kept local-only and are not committed to the public repository.',
    'This summary records the validator result only: DSG_PROVIDER_PROOF_COMPLETE with all five provider lanes passing.',
    'Browser proof is manual-browser-evidence until a fully automated browser provider is connected.',
  ],
};

export function isDsgProviderProofComplete(): boolean {
  return DSG_PROVIDER_PROOF_SUMMARY.ok && DSG_PROVIDER_PROOF_SUMMARY.claim === 'DSG_PROVIDER_PROOF_COMPLETE';
}
