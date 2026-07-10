import { HeuristicMatcher } from './heuristics';
import type { DetectedService, DiscoveryAnalysis, SuggestedProvider } from '../types';
import { canonicalHash } from '@/lib/runtime/canonical';
import { capabilityEngine } from '../capabilities';

interface ProjectFiles {
  packageJson?: string;
  dockerCompose?: string;
  dockerfile?: string;
  envExample?: string;
  workflows?: string[];
}

/**
 * Infrastructure discovery analyzer
 * Detects services from project files using heuristics + optional AI
 */
export class DiscoveryAnalyzer {
  private heuristics = new HeuristicMatcher();

  async analyzeProject(
    projectName: string,
    githubUrl: string | undefined,
    files: ProjectFiles,
    mode: 'heuristic' | 'ai' | 'both' = 'heuristic',
  ): Promise<DiscoveryAnalysis> {
    const detectedServices: DetectedService[] = [];

    // Phase 1: Heuristic detection (fast, always available)
    if (mode === 'heuristic' || mode === 'both') {
      const heuristicDetections = this.runHeuristics(files);
      detectedServices.push(...heuristicDetections);
    }

    // Phase 2: AI detection (optional, accurate)
    if (mode === 'ai' || mode === 'both') {
      // Placeholder for Claude LLM integration
      // In Phase 3.5, integrate with @anthropic-ai/sdk
      console.debug('[discovery] AI detection not yet implemented');
    }

    // Deduplicate and merge results
    const merged = this.deduplicateServices(detectedServices);

    // Phase 3: Match services to providers
    const suggestedProviders = this.matchServicesToProviders(merged);

    // Generate proof hash for plan approval
    const proofHash = canonicalHash(JSON.stringify({ detected: merged, suggested: suggestedProviders }));

    return {
      id: crypto.randomUUID(),
      org_id: '', // Will be set by caller
      project_name: projectName,
      github_url: githubUrl,
      scan_mode: mode,
      detected_services: merged,
      suggested_providers: suggestedProviders,
      analysis_timestamp: new Date(),
      proof_hash: proofHash,
      created_by: '', // Will be set by caller
      created_at: new Date(),
    };
  }

  private runHeuristics(files: ProjectFiles): DetectedService[] {
    const detected = new Set<string>();

    if (files.packageJson) {
      this.heuristics.matchPackageJson(files.packageJson).forEach((s) => detected.add(s));
    }

    if (files.dockerCompose) {
      this.heuristics.matchDockerCompose(files.dockerCompose).forEach((s) => detected.add(s));
    }

    if (files.dockerfile) {
      this.heuristics.matchDockerfile(files.dockerfile).forEach((s) => detected.add(s));
    }

    if (files.envExample) {
      this.heuristics.matchEnvExample(files.envExample).forEach((s) => detected.add(s));
    }

    if (files.workflows && files.workflows.length > 0) {
      for (const workflow of files.workflows) {
        this.heuristics.matchWorkflows(workflow).forEach((s) => detected.add(s));
      }
    }

    return Array.from(detected).map((service) => ({
      service,
      confidence: 0.85, // Average heuristic confidence
      source: 'heuristic' as const,
    }));
  }

  private deduplicateServices(services: DetectedService[]): DetectedService[] {
    const map = new Map<string, DetectedService>();

    for (const service of services) {
      const existing = map.get(service.service);
      if (!existing || service.confidence > existing.confidence) {
        map.set(service.service, service);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
  }

  private matchServicesToProviders(detectedServices: DetectedService[]): SuggestedProvider[] {
    const providers: Map<string, SuggestedProvider> = new Map();

    // Map services to capabilities
    const serviceCapabilityMap: Record<string, string[]> = {
      'Next.js': ['deploy_application'],
      FastAPI: ['deploy_application'],
      Django: ['deploy_application'],
      PostgreSQL: ['create_database'],
      Redis: ['create_cache'],
      MongoDB: ['create_database'],
      Stripe: ['payment_processing'],
      OpenAI: ['api_key_management'],
      'GitHub Actions': ['ci_cd'],
      Kubernetes: ['orchestration'],
    };

    // Query capability engine for providers
    for (const detected of detectedServices) {
      const capabilities = serviceCapabilityMap[detected.service] || [];

      for (const capability of capabilities) {
        const matches = capabilityEngine.query({
          capability,
        });

        for (const match of matches) {
          const key = match.provider_id;
          if (!providers.has(key)) {
            providers.set(key, {
              capability,
              provider: match.provider_id,
              confidence: match.confidence * detected.confidence,
              required: true,
              alternatives: matches
                .filter((m) => m.provider_id !== match.provider_id)
                .map((m) => m.provider_id),
            });
          }
        }
      }
    }

    return Array.from(providers.values()).sort((a, b) => b.confidence - a.confidence);
  }
}
