import { capabilityEngine } from './engine';
import type { CapabilityMatch } from './types';

/**
 * Register default capabilities from known manifests
 * This maps provider capabilities for discovery
 */
export function registerDefaultCapabilities(): void {
  // create_repository capability
  capabilityEngine.register('create_repository', 'repository', [
    {
      provider_id: 'github',
      provider_name: 'GitHub',
      confidence: 1.0,
      sandbox_supported: true,
    } as CapabilityMatch,
    {
      provider_id: 'gitlab',
      provider_name: 'GitLab',
      confidence: 0.95,
      sandbox_supported: true,
    } as CapabilityMatch,
  ]);

  // create_webhook capability
  capabilityEngine.register('create_webhook', 'webhook', [
    {
      provider_id: 'github',
      provider_name: 'GitHub',
      confidence: 0.99,
      sandbox_supported: true,
    } as CapabilityMatch,
    {
      provider_id: 'stripe',
      provider_name: 'Stripe',
      confidence: 0.98,
      sandbox_supported: true,
    } as CapabilityMatch,
    {
      provider_id: 'vercel',
      provider_name: 'Vercel',
      confidence: 0.90,
      sandbox_supported: true,
    } as CapabilityMatch,
  ]);

  // create_database capability
  capabilityEngine.register('create_database', 'database', [
    {
      provider_id: 'supabase',
      provider_name: 'Supabase',
      confidence: 1.0,
      sandbox_supported: true,
    } as CapabilityMatch,
  ]);

  // deploy_application capability
  capabilityEngine.register('deploy_application', 'deployment', [
    {
      provider_id: 'vercel',
      provider_name: 'Vercel',
      confidence: 1.0,
      sandbox_supported: true,
    } as CapabilityMatch,
  ]);

  // api_key_management capability
  capabilityEngine.register('api_key_management', 'api_key', [
    {
      provider_id: 'openai',
      provider_name: 'OpenAI',
      confidence: 1.0,
      sandbox_supported: true,
    } as CapabilityMatch,
    {
      provider_id: 'stripe',
      provider_name: 'Stripe',
      confidence: 0.99,
      sandbox_supported: true,
    } as CapabilityMatch,
    {
      provider_id: 'supabase',
      provider_name: 'Supabase',
      confidence: 0.98,
      sandbox_supported: true,
    } as CapabilityMatch,
  ]);

  console.debug('[capabilities] Registered default capabilities');
}
