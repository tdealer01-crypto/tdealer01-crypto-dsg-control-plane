/**
 * Central env resolver for Agent OS.
 *
 * Resolution order per name:
 *   1. process.env (Vercel / local env)
 *   2. dsg_secrets table in Supabase (set once in DB, no per-deploy env setup)
 *
 * Values stay in server memory only. Callers receive values for runtime use;
 * the report carries names + sources only and is safe to return to clients.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';

export type EnvSource = 'process.env' | 'dsg_secrets' | 'missing';

export interface EnvReportEntry {
  name: string;
  source: EnvSource;
}

export interface EnvResolution {
  /** Resolved values — server-side use only, never serialize into a response. */
  values: Record<string, string>;
  /** Safe to expose: names and where each resolved from. */
  report: EnvReportEntry[];
}

const cache = new Map<string, { value: string; source: EnvSource }>();

export async function resolveEnv(names: string[]): Promise<EnvResolution> {
  const values: Record<string, string> = {};
  const sources = new Map<string, EnvSource>();
  const missing: string[] = [];

  for (const name of names) {
    const cached = cache.get(name);
    if (cached) {
      values[name] = cached.value;
      sources.set(name, cached.source);
      continue;
    }

    const fromEnv = process.env[name];
    if (fromEnv) {
      cache.set(name, { value: fromEnv, source: 'process.env' });
      values[name] = fromEnv;
      sources.set(name, 'process.env');
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            in: (col: string, vals: string[]) => Promise<{ data: Array<{ name: string; value: string }> | null; error: { message: string } | null }>;
          };
        };
      })
        .from('dsg_secrets')
        .select('name, value')
        .in('name', missing);

      const found = new Map((error ? [] : (data ?? [])).map((r) => [r.name, r.value]));
      for (const name of missing) {
        const value = found.get(name);
        if (typeof value === 'string' && value.length > 0) {
          cache.set(name, { value, source: 'dsg_secrets' });
          values[name] = value;
          sources.set(name, 'dsg_secrets');
        } else {
          sources.set(name, 'missing');
        }
      }
    } catch {
      for (const name of missing) {
        if (!sources.has(name)) sources.set(name, 'missing');
      }
    }
  }

  const report: EnvReportEntry[] = names.map((name) => ({
    name,
    source: sources.get(name) ?? 'missing',
  }));

  return { values, report };
}

export function clearEnvResolverCache(): void {
  cache.clear();
}
