import { manifestRegistry } from './registry';
import { gitHubManifest } from './github';
import { stripeManifest } from './stripe';
import { vercelManifest } from './vercel';
import { supabaseManifest } from './supabase';
import { openaiManifest } from './openai';

export function registerDefaultManifests(): void {
  const manifests = [gitHubManifest, stripeManifest, vercelManifest, supabaseManifest, openaiManifest];

  for (const manifest of manifests) {
    const validation = manifestRegistry.validate(manifest);
    if (!validation.valid) {
      console.error(`Invalid manifest ${manifest.id}:`, validation.errors);
      continue;
    }

    manifestRegistry.register(manifest);
    console.debug(`Registered manifest: ${manifest.id}`);
  }
}
