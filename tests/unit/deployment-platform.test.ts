import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  detectPlatform,
  getDeploymentIdentity,
  getPublicOrigin,
  isManagedHost,
} from '../../lib/deployment/platform';

/**
 * These tests pin the host-detection contract that the Vercel -> Render move
 * depends on. The failure mode they guard against is silent: on Render the
 * VERCEL_* variables are simply absent, so unguarded reads degrade to
 * 'local'/'unknown' instead of throwing.
 */

const PLATFORM_KEYS = [
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_GIT_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_REF',
  'VERCEL_DEPLOYMENT_ID',
  'VERCEL_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'RENDER',
  'RENDER_GIT_COMMIT',
  'RENDER_GIT_BRANCH',
  'RENDER_EXTERNAL_URL',
  'RENDER_EXTERNAL_HOSTNAME',
  'RENDER_SERVICE_NAME',
  'RENDER_SERVICE_ID',
  'RENDER_INSTANCE_ID',
  'IS_PULL_REQUEST',
  'GITHUB_ACTIONS',
  'GITHUB_SHA',
  'GITHUB_REF_NAME',
  'GIT_COMMIT_SHA',
  'APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const key of PLATFORM_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of PLATFORM_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('detectPlatform', () => {
  it('reports render when RENDER is set', () => {
    process.env.RENDER = 'true';
    expect(detectPlatform()).toBe('render');
  });

  it('reports vercel when VERCEL is set', () => {
    process.env.VERCEL = '1';
    expect(detectPlatform()).toBe('vercel');
  });

  it('reports github-actions in CI without a host', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(detectPlatform()).toBe('github-actions');
  });

  it('falls back to local when nothing is set', () => {
    expect(detectPlatform()).toBe('local');
  });
});

describe('getDeploymentIdentity on Render', () => {
  beforeEach(() => {
    process.env.RENDER = 'true';
    process.env.RENDER_GIT_COMMIT = 'abcdef1234567890abcdef1234567890abcdef12';
    process.env.RENDER_GIT_BRANCH = 'main';
    process.env.RENDER_EXTERNAL_URL = 'https://dsg-control-plane.onrender.com';
    process.env.RENDER_SERVICE_NAME = 'dsg-control-plane';
    process.env.RENDER_INSTANCE_ID = 'srv-abc123';
    process.env.NODE_ENV = 'production';
  });

  it('resolves commit, branch and service from RENDER_* vars', () => {
    const identity = getDeploymentIdentity();
    expect(identity.platform).toBe('render');
    expect(identity.commit).toBe('abcdef1234567890abcdef1234567890abcdef12');
    expect(identity.commitShort).toBe('abcdef1');
    expect(identity.branch).toBe('main');
    expect(identity.serviceName).toBe('dsg-control-plane');
    expect(identity.deploymentId).toBe('srv-abc123');
  });

  it('classifies production, and preview when IS_PULL_REQUEST is true', () => {
    expect(getDeploymentIdentity().env).toBe('production');
    process.env.IS_PULL_REQUEST = 'true';
    expect(getDeploymentIdentity().env).toBe('preview');
  });

  it('counts as a managed host so fail-closed gates stay strict', () => {
    expect(isManagedHost()).toBe(true);
  });

  it('exposes an absolute origin', () => {
    expect(getPublicOrigin()).toBe('https://dsg-control-plane.onrender.com');
  });
});

describe('getDeploymentIdentity on Vercel', () => {
  beforeEach(() => {
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_SHA = '1111111111111111111111111111111111111111';
    process.env.VERCEL_GIT_COMMIT_REF = 'feature/x';
    process.env.VERCEL_URL = 'my-app-abc123.vercel.app';
  });

  it('resolves identity from VERCEL_* vars', () => {
    const identity = getDeploymentIdentity();
    expect(identity.platform).toBe('vercel');
    expect(identity.commit).toBe('1111111111111111111111111111111111111111');
    expect(identity.branch).toBe('feature/x');
    expect(identity.env).toBe('preview');
    expect(identity.isManagedHost).toBe(true);
  });

  it('adds the missing scheme to VERCEL_URL', () => {
    // VERCEL_URL is a bare hostname; interpolating it directly produced
    // scheme-less callback URLs that Stripe rejects.
    expect(getPublicOrigin()).toBe('https://my-app-abc123.vercel.app');
  });
});

describe('origin precedence', () => {
  it('prefers APP_URL over the host-provided origin', () => {
    process.env.RENDER = 'true';
    process.env.RENDER_EXTERNAL_URL = 'https://service.onrender.com';
    process.env.APP_URL = 'https://app.dsg.pics';
    expect(getPublicOrigin()).toBe('https://app.dsg.pics');
  });

  it('normalizes a bare hostname in APP_URL to an https origin', () => {
    process.env.APP_URL = 'app.dsg.pics';
    expect(getPublicOrigin()).toBe('https://app.dsg.pics');
  });

  it('strips any path from the configured origin', () => {
    process.env.APP_URL = 'https://app.dsg.pics/dashboard';
    expect(getPublicOrigin()).toBe('https://app.dsg.pics');
  });
});

describe('local fallbacks', () => {
  it('reports commit local and is not a managed host', () => {
    const identity = getDeploymentIdentity();
    expect(identity.commit).toBe('local');
    expect(identity.commitShort).toBe('local');
    expect(identity.isManagedHost).toBe(false);
    expect(identity.externalUrl).toBeNull();
  });

  it('uses the supplied fallback origin', () => {
    expect(getPublicOrigin()).toBe('http://localhost:3000');
    expect(getPublicOrigin('http://127.0.0.1:4000')).toBe('http://127.0.0.1:4000');
  });
});
