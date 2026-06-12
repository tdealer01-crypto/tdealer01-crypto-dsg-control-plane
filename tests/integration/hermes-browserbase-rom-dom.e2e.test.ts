import { describe, expect, it } from 'vitest';
import type { RawDomElement, SafeDomCommand } from '@/lib/dsg/safe-dom/types';
import { buildDryRunHermesRomContext } from '@/lib/dsg/hermes-e2e/rom';
import { buildHermesDomMirror } from '@/lib/dsg/hermes-e2e/dom-mirror';
import { executeBrowserbaseSafeDomCommand } from '@/lib/dsg/hermes-e2e/browserbase-safe-adapter';

describe('Hermes + ROM + Safe DOM + Browserbase dry-run E2E', () => {
  const frameId = 'frame_contact_form';

  const rawElements: RawDomElement[] = [
    {
      selector: '#name',
      role: 'input',
      label: 'Name',
      allowedOps: ['type'],
    },
    {
      selector: '#email',
      role: 'input',
      label: 'Email',
      allowedOps: ['type'],
    },
    {
      selector: '#message',
      role: 'textarea',
      label: 'Message',
      allowedOps: ['type'],
    },
    {
      selector: '#next-step',
      role: 'button',
      text: 'Next',
      allowedOps: ['click'],
    },
    {
      selector: '#delete-account',
      role: 'button',
      text: 'Delete account',
      allowedOps: ['click'],
    },
  ];

  it('completes safe form submit in dry-run without touching real website', async () => {
    const rom = buildDryRunHermesRomContext({
      goal: 'Fill demo form and submit safely',
      policyHints: ['no_real_website_navigation', 'safe_dom_required'],
    });

    const mirror = buildHermesDomMirror({
      frameId,
      rawElements,
      romContextHash: rom.contextHash,
    });

    const nextBtn = mirror.manifest.find((item) => item.text === 'Next');
    expect(nextBtn).toBeTruthy();

    const deleteButton = mirror.manifest.find((item) => item.text === 'Delete account');
    expect(deleteButton).toBeFalsy();

    const command: SafeDomCommand = {
      frameId,
      elementId: nextBtn!.id,
      operation: 'click',
    };

    const result = await executeBrowserbaseSafeDomCommand({
      workspaceId: 'workspace_demo',
      orgId: 'org_demo',
      agentId: 'hermes',
      effectId: 'effect_demo_001',
      action: 'submit_safe_contact_form',
      sessionId: 'dry_run_session_001',
      frameId,
      rawElements,
      command,
      rom,
      actionDescriptor: {
        domain: 'form',
        operation: 'submit',
        target: 'contact form',
        dataSensitivity: 'internal',
        externalEffect: true,
        reversibility: 'partially_reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
      executionMode: 'dry_run',
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('DRY_RUN_COMPLETED');
    expect(result.decision).toBe('ALLOW');
    expect(result.completedSafely).toBe(true);
    expect(result.trace.browserbaseTouchedRealWebsite).toBe(false);
    expect(result.trace.romContextHash).toBe(rom.contextHash);
  });

  it('blocks dangerous DOM element because it is not exposed to the agent', async () => {
    const rom = buildDryRunHermesRomContext({
      goal: 'Try dangerous delete action',
      policyHints: ['safe_dom_required'],
    });

    const command: SafeDomCommand = {
      frameId,
      elementId: 'fake-delete-id',
      operation: 'click',
    };

    const result = await executeBrowserbaseSafeDomCommand({
      workspaceId: 'workspace_demo',
      orgId: 'org_demo',
      agentId: 'hermes',
      effectId: 'effect_demo_002',
      action: 'attempt_delete_account',
      sessionId: 'dry_run_session_002',
      frameId,
      rawElements,
      command,
      rom,
      actionDescriptor: {
        domain: 'browser',
        operation: 'click',
        target: 'Delete account',
        dataSensitivity: 'internal',
        externalEffect: true,
        reversibility: 'irreversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
      executionMode: 'dry_run',
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('BLOCKED');
    expect(result.decision).toBe('BLOCK');
    expect(result.completedSafely).toBe(true);
    expect(result.reason).toBe('ELEMENT_NOT_EXPOSED_TO_AGENT');
    expect(result.trace.browserbaseTouchedRealWebsite).toBe(false);
  });

  it('blocks secret/credential task before DOM execution', async () => {
    const rom = buildDryRunHermesRomContext({
      goal: 'Fill API key field',
      policyHints: ['secret_fields_blocked'],
    });

    const mirror = buildHermesDomMirror({
      frameId,
      rawElements,
      romContextHash: rom.contextHash,
    });

    const nextBtn = mirror.manifest.find((item) => item.text === 'Next');
    console.log('Manifest elements:', mirror.manifest.map(m => m.text || m.label));
    expect(nextBtn).toBeTruthy();

    const result = await executeBrowserbaseSafeDomCommand({
      workspaceId: 'workspace_demo',
      orgId: 'org_demo',
      agentId: 'hermes',
      effectId: 'effect_demo_003',
      action: 'fill_secret_field',
      sessionId: 'dry_run_session_003',
      frameId,
      rawElements,
      command: {
        frameId,
        elementId: nextBtn!.id,
        operation: 'click',
      },
      rom,
      actionDescriptor: {
        domain: 'form',
        operation: 'submit',
        target: 'API Key',
        dataSensitivity: 'credential',
        externalEffect: true,
        reversibility: 'irreversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: false,
      },
      executionMode: 'dry_run',
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('BLOCKED');
    expect(result.decision).toBe('BLOCK');
    expect(result.risk).toBe('CRITICAL');
    expect(result.reason).toBe('CREDENTIAL_OR_SECRET_BLOCKED');
    expect(result.completedSafely).toBe(true);
    expect(result.trace.browserbaseTouchedRealWebsite).toBe(false);
  });
});
