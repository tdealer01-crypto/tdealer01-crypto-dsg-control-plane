import { buildSafeManifest } from '@/lib/dsg/safe-dom/manifest';
import type { RawDomElement } from '@/lib/dsg/safe-dom/types';
import { sha256Json } from './hash';
import type { HermesDomMirror } from './types';

export function buildHermesDomMirror(input: {
  frameId: string;
  rawElements: RawDomElement[];
  romContextHash?: string;
  ttlSeconds?: number;
}): HermesDomMirror {
  const { view, manifest } = buildSafeManifest(input.rawElements, input.frameId, {
    ttlSeconds: input.ttlSeconds ?? 60,
    filterDangerousElements: true,
  });

  const mirrorHash = sha256Json({
    frameId: input.frameId,
    view,
    manifestHash: sha256Json(manifest),
    romContextHash: input.romContextHash ?? null,
    policyVersion: 'safe-dom-v1',
  });

  return {
    mode: 'HERMES_SAFE_DOM_MIRROR',
    frameId: input.frameId,
    safeView: view,
    manifest,
    mirrorHash,
    romContextHash: input.romContextHash,
    rule: 'AGENT_CAN_ONLY_ACT_ON_EXPOSED_SAFE_DOM_ELEMENT_IDS',
  };
}
