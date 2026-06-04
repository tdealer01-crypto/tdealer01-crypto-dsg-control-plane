import { getSupabaseAdmin } from '@/lib/supabase-server';
import type {
  HermesAgent,
  HermesSession,
  HermesSessionEvent,
  HermesSessionThread,
  HermesMemoryStore,
  HermesMemory,
  HermesVault,
  HermesSkill,
  HermesEnvironment,
  HermesUserProfile,
  HermesWebhook,
  HermesSessionEventData,
  UserSentEvent,
  PageCursor,
  WebhookEvent,
} from './types';

function newId(prefix: string): string {
  const arr = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  return prefix + '_' + hex;
}

function now(): string {
  return new Date().toISOString();
}

// ── Agents ─────────────────────────────────────────────────────────────────────

export async function createAgent(
  orgId: string,
  input: {
    model: string;
    name: string;
    description?: string;
    system?: string;
    tools?: HermesAgent['tools'];
    skills?: string[];
    mcp_servers?: HermesAgent['mcp_servers'];
    multiagent?: HermesAgent['multiagent'];
    metadata?: Record<string, unknown>;
  },
): Promise<HermesAgent> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesAgent = {
    id: newId('agent'),
    org_id: orgId,
    version: 1,
    name: input.name,
    description: input.description,
    model: input.model,
    system: input.system,
    tools: input.tools ?? [],
    skills: input.skills ?? [],
    mcp_servers: input.mcp_servers ?? [],
    multiagent: input.multiagent,
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_agents').insert(record);
  if (error) throw new Error('Failed to create agent');
  return record;
}

export async function getAgent(orgId: string, id: string, version?: number): Promise<HermesAgent | null> {
  const supabase = getSupabaseAdmin();
  let q = (supabase as any).from('hermes_agents').select('*').eq('org_id', orgId).eq('id', id);
  if (version !== undefined) q = q.eq('version', version);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error('Failed to get agent');
  return data ?? null;
}

export async function updateAgent(
  orgId: string,
  id: string,
  version: number,
  patch: Partial<Pick<HermesAgent, 'name' | 'description' | 'system' | 'tools' | 'skills' | 'mcp_servers' | 'multiagent' | 'metadata'>>,
): Promise<HermesAgent | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_agents')
    .update({ ...patch, version: version + 1, updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .eq('version', version)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to update agent');
  return data ?? null;
}

export async function archiveAgent(orgId: string, id: string): Promise<HermesAgent | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_agents')
    .update({ archived_at: now(), updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to archive agent');
  return data ?? null;
}

export async function listAgents(
  orgId: string,
  opts: { include_archived?: boolean; limit?: number; after?: string },
): Promise<PageCursor<HermesAgent>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_agents')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (!opts.include_archived) q = q.is('archived_at', null);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list agents');
  const rows: HermesAgent[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Sessions ───────────────────────────────────────────────────────────────────

export async function createSession(
  orgId: string,
  input: {
    agent_id: string;
    agent_version?: number;
    environment_id?: string;
    vault_ids?: string[];
    resources?: HermesSession['resources'];
    title?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<HermesSession> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesSession = {
    id: newId('sess'),
    org_id: orgId,
    agent_id: input.agent_id,
    agent_version: input.agent_version,
    environment_id: input.environment_id,
    vault_ids: input.vault_ids ?? [],
    resources: input.resources ?? [],
    title: input.title,
    status: 'idle',
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_sessions').insert(record);
  if (error) throw new Error('Failed to create session');
  return record;
}

export async function getSession(orgId: string, id: string): Promise<HermesSession | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_sessions')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to get session');
  return data ?? null;
}

export async function updateSession(
  orgId: string,
  id: string,
  patch: Partial<Pick<HermesSession, 'title' | 'metadata' | 'vault_ids' | 'status'>>,
): Promise<HermesSession | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_sessions')
    .update({ ...patch, updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to update session');
  return data ?? null;
}

export async function deleteSession(orgId: string, id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('hermes_sessions')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error('Failed to delete session');
}

export async function archiveSession(orgId: string, id: string): Promise<HermesSession | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_sessions')
    .update({ archived_at: now(), status: 'archived', updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to archive session');
  return data ?? null;
}

export async function listSessions(
  orgId: string,
  opts: {
    agent_id?: string;
    agent_version?: number;
    statuses?: HermesSession['status'][];
    include_archived?: boolean;
    limit?: number;
    after?: string;
  },
): Promise<PageCursor<HermesSession>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_sessions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (!opts.include_archived) q = q.is('archived_at', null);
  if (opts.agent_id) q = q.eq('agent_id', opts.agent_id);
  if (opts.agent_version !== undefined) q = q.eq('agent_version', opts.agent_version);
  if (opts.statuses?.length) q = q.in('status', opts.statuses);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list sessions');
  const rows: HermesSession[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Session Events ─────────────────────────────────────────────────────────────

export async function appendSessionEvent(
  orgId: string,
  sessionId: string,
  event: HermesSessionEventData,
): Promise<HermesSessionEvent> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesSessionEvent = {
    id: newId('evt'),
    org_id: orgId,
    session_id: sessionId,
    event,
    created_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_session_events').insert(record);
  if (error) throw new Error('Failed to append session event');
  return record;
}

export async function appendUserEvent(
  orgId: string,
  sessionId: string,
  event: UserSentEvent,
): Promise<HermesSessionEvent> {
  return appendSessionEvent(orgId, sessionId, event as unknown as HermesSessionEventData);
}

export async function listSessionEvents(
  orgId: string,
  sessionId: string,
  opts: { event_types?: string[]; order?: 'asc' | 'desc'; limit?: number; after?: string },
): Promise<PageCursor<HermesSessionEvent>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 50, 500);
  const order = opts.order ?? 'asc';
  let q = (supabase as any)
    .from('hermes_session_events')
    .select('*')
    .eq('org_id', orgId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: order === 'asc' })
    .limit(limit + 1);
  if (opts.after) q = order === 'asc' ? q.gt('created_at', opts.after) : q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list session events');
  const rows: HermesSessionEvent[] = data ?? [];
  const filteredRows = opts.event_types?.length
    ? rows.filter((r) => opts.event_types!.includes(r.event.type))
    : rows;
  const has_more = filteredRows.length > limit;
  const items = has_more ? filteredRows.slice(0, limit) : filteredRows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Session Threads ────────────────────────────────────────────────────────────

export async function listSessionThreads(
  orgId: string,
  sessionId: string,
  opts: { limit?: number; after?: string },
): Promise<PageCursor<HermesSessionThread>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_session_threads')
    .select('*')
    .eq('org_id', orgId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list session threads');
  const rows: HermesSessionThread[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Memory Stores ──────────────────────────────────────────────────────────────

export async function createMemoryStore(
  orgId: string,
  input: { name: string; description?: string; metadata?: Record<string, unknown> },
): Promise<HermesMemoryStore> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesMemoryStore = {
    id: newId('mstore'),
    org_id: orgId,
    name: input.name,
    description: input.description,
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_memory_stores').insert(record);
  if (error) throw new Error('Failed to create memory store');
  return record;
}

export async function getMemoryStore(orgId: string, id: string): Promise<HermesMemoryStore | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_memory_stores')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to get memory store');
  return data ?? null;
}

export async function updateMemoryStore(
  orgId: string,
  id: string,
  patch: Partial<Pick<HermesMemoryStore, 'name' | 'description' | 'metadata'>>,
): Promise<HermesMemoryStore | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_memory_stores')
    .update({ ...patch, updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to update memory store');
  return data ?? null;
}

export async function deleteMemoryStore(orgId: string, id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('hermes_memory_stores')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error('Failed to delete memory store');
}

export async function archiveMemoryStore(orgId: string, id: string): Promise<HermesMemoryStore | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_memory_stores')
    .update({ archived_at: now(), updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to archive memory store');
  return data ?? null;
}

export async function listMemoryStores(
  orgId: string,
  opts: { include_archived?: boolean; limit?: number; after?: string },
): Promise<PageCursor<HermesMemoryStore>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_memory_stores')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (!opts.include_archived) q = q.is('archived_at', null);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list memory stores');
  const rows: HermesMemoryStore[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Vaults ─────────────────────────────────────────────────────────────────────

export async function createVault(
  orgId: string,
  input: { display_name: string; metadata?: Record<string, unknown> },
): Promise<HermesVault> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesVault = {
    id: newId('vault'),
    org_id: orgId,
    display_name: input.display_name,
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_vaults').insert(record);
  if (error) throw new Error('Failed to create vault');
  return record;
}

export async function getVault(orgId: string, id: string): Promise<HermesVault | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_vaults')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to get vault');
  return data ?? null;
}

export async function updateVault(
  orgId: string,
  id: string,
  patch: Partial<Pick<HermesVault, 'display_name' | 'metadata'>>,
): Promise<HermesVault | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_vaults')
    .update({ ...patch, updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to update vault');
  return data ?? null;
}

export async function deleteVault(orgId: string, id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('hermes_vaults')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error('Failed to delete vault');
}

export async function archiveVault(orgId: string, id: string): Promise<HermesVault | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_vaults')
    .update({ archived_at: now(), updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to archive vault');
  return data ?? null;
}

export async function listVaults(
  orgId: string,
  opts: { include_archived?: boolean; limit?: number; after?: string },
): Promise<PageCursor<HermesVault>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_vaults')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (!opts.include_archived) q = q.is('archived_at', null);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list vaults');
  const rows: HermesVault[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Skills ─────────────────────────────────────────────────────────────────────

export async function createSkill(
  orgId: string,
  input: { display_title?: string; file_ids?: string[]; metadata?: Record<string, unknown> },
): Promise<HermesSkill> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesSkill = {
    id: newId('skill'),
    org_id: orgId,
    display_title: input.display_title,
    source: 'custom',
    file_ids: input.file_ids ?? [],
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_skills').insert(record);
  if (error) throw new Error('Failed to create skill');
  return record;
}

export async function getSkill(orgId: string, id: string): Promise<HermesSkill | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_skills')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to get skill');
  return data ?? null;
}

export async function deleteSkill(orgId: string, id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('hermes_skills')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error('Failed to delete skill');
}

export async function listSkills(
  orgId: string,
  opts: { source?: 'custom' | 'anthropic'; limit?: number; after?: string },
): Promise<PageCursor<HermesSkill>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_skills')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (opts.source) q = q.eq('source', opts.source);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list skills');
  const rows: HermesSkill[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Environments ───────────────────────────────────────────────────────────────

export async function createEnvironment(
  orgId: string,
  input: { name: string; config?: HermesEnvironment['config']; metadata?: Record<string, unknown> },
): Promise<HermesEnvironment> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesEnvironment = {
    id: newId('env'),
    org_id: orgId,
    name: input.name,
    config: input.config ?? {},
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_environments').insert(record);
  if (error) throw new Error('Failed to create environment');
  return record;
}

export async function getEnvironment(orgId: string, id: string): Promise<HermesEnvironment | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_environments')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to get environment');
  return data ?? null;
}

export async function updateEnvironment(
  orgId: string,
  id: string,
  patch: Partial<Pick<HermesEnvironment, 'name' | 'config' | 'metadata'>>,
): Promise<HermesEnvironment | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_environments')
    .update({ ...patch, updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to update environment');
  return data ?? null;
}

export async function deleteEnvironment(orgId: string, id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('hermes_environments')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error('Failed to delete environment');
}

export async function archiveEnvironment(orgId: string, id: string): Promise<HermesEnvironment | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_environments')
    .update({ archived_at: now(), updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to archive environment');
  return data ?? null;
}

export async function listEnvironments(
  orgId: string,
  opts: { include_archived?: boolean; limit?: number; after?: string },
): Promise<PageCursor<HermesEnvironment>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_environments')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (!opts.include_archived) q = q.is('archived_at', null);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list environments');
  const rows: HermesEnvironment[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── User Profiles ──────────────────────────────────────────────────────────────

export async function createUserProfile(
  orgId: string,
  input: {
    external_id: string;
    name?: string;
    relationship?: HermesUserProfile['relationship'];
    metadata?: Record<string, unknown>;
  },
): Promise<HermesUserProfile> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesUserProfile = {
    id: newId('uprof'),
    org_id: orgId,
    external_id: input.external_id,
    name: input.name,
    relationship: input.relationship,
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_user_profiles').insert(record);
  if (error) throw new Error('Failed to create user profile');
  return record;
}

export async function getUserProfile(orgId: string, id: string): Promise<HermesUserProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_user_profiles')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to get user profile');
  return data ?? null;
}

export async function updateUserProfile(
  orgId: string,
  id: string,
  patch: Partial<Pick<HermesUserProfile, 'name' | 'metadata'>>,
): Promise<HermesUserProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_user_profiles')
    .update({ ...patch, updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to update user profile');
  return data ?? null;
}

export async function listUserProfiles(
  orgId: string,
  opts: { order?: 'asc' | 'desc'; limit?: number; after?: string },
): Promise<PageCursor<HermesUserProfile>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  const asc = (opts.order ?? 'desc') === 'asc';
  let q = (supabase as any)
    .from('hermes_user_profiles')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: asc })
    .limit(limit + 1);
  if (opts.after) q = asc ? q.gt('created_at', opts.after) : q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list user profiles');
  const rows: HermesUserProfile[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Webhooks ───────────────────────────────────────────────────────────────────

export async function createWebhook(
  orgId: string,
  input: { url: string; events: WebhookEvent[]; metadata?: Record<string, unknown> },
): Promise<HermesWebhook> {
  const supabase = getSupabaseAdmin();
  const ts = now();
  const record: HermesWebhook = {
    id: newId('wh'),
    org_id: orgId,
    url: input.url,
    events: input.events,
    metadata: input.metadata ?? {},
    created_at: ts,
    updated_at: ts,
  };
  const { error } = await (supabase as any).from('hermes_webhooks').insert(record);
  if (error) throw new Error('Failed to create webhook');
  return record;
}

export async function getWebhook(orgId: string, id: string): Promise<HermesWebhook | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_webhooks')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Failed to get webhook');
  return data ?? null;
}

export async function updateWebhook(
  orgId: string,
  id: string,
  patch: Partial<Pick<HermesWebhook, 'url' | 'events' | 'metadata'>>,
): Promise<HermesWebhook | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_webhooks')
    .update({ ...patch, updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to update webhook');
  return data ?? null;
}

export async function deleteWebhook(orgId: string, id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await (supabase as any)
    .from('hermes_webhooks')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error('Failed to delete webhook');
}

export async function archiveWebhook(orgId: string, id: string): Promise<HermesWebhook | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from('hermes_webhooks')
    .update({ archived_at: now(), updated_at: now() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error('Failed to archive webhook');
  return data ?? null;
}

export async function listWebhooks(
  orgId: string,
  opts: { include_archived?: boolean; limit?: number; after?: string },
): Promise<PageCursor<HermesWebhook>> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(opts.limit ?? 20, 100);
  let q = (supabase as any)
    .from('hermes_webhooks')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  if (!opts.include_archived) q = q.is('archived_at', null);
  if (opts.after) q = q.lt('created_at', opts.after);
  const { data, error } = await q;
  if (error) throw new Error('Failed to list webhooks');
  const rows: HermesWebhook[] = data ?? [];
  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { data: items, has_more, first_id: items[0]?.id, last_id: items[items.length - 1]?.id };
}

// ── Webhook dispatcher (fire-and-forget) ───────────────────────────────────────

export function dispatchWebhookEvent(
  orgId: string,
  eventType: WebhookEvent,
  payload: unknown,
): void {
  const supabase = getSupabaseAdmin();
  (supabase as any)
    .from('hermes_webhooks')
    .select('url')
    .eq('org_id', orgId)
    .is('archived_at', null)
    .contains('events', [eventType])
    .then(({ data }: { data: Array<{ url: string }> | null }) => {
      if (!data) return;
      for (const wh of data) {
        fetch(wh.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: eventType, data: payload, org_id: orgId }),
          signal: AbortSignal.timeout(5_000),
        }).catch(() => {});
      }
    })
    .catch(() => {});
}
