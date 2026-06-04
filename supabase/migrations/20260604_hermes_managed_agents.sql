-- Hermes Managed Agents tables
-- Scoped by org_id; RLS enforces org isolation via app.org_id session variable.

-- ── hermes_agents ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_agents (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL,
  version        INTEGER NOT NULL DEFAULT 1,
  name           TEXT NOT NULL,
  description    TEXT,
  model          TEXT NOT NULL,
  system         TEXT,
  tools          JSONB NOT NULL DEFAULT '[]',
  skills         JSONB NOT NULL DEFAULT '[]',
  mcp_servers    JSONB NOT NULL DEFAULT '[]',
  multiagent     JSONB,
  metadata       JSONB NOT NULL DEFAULT '{}',
  archived_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_agents_org_id_idx ON hermes_agents (org_id);

ALTER TABLE hermes_agents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_agents' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_agents
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_sessions (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL,
  agent_id       TEXT NOT NULL,
  agent_version  INTEGER,
  environment_id TEXT,
  vault_ids      JSONB NOT NULL DEFAULT '[]',
  resources      JSONB NOT NULL DEFAULT '[]',
  title          TEXT,
  status         TEXT NOT NULL DEFAULT 'idle',
  metadata       JSONB NOT NULL DEFAULT '{}',
  archived_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_sessions_org_id_idx ON hermes_sessions (org_id);
CREATE INDEX IF NOT EXISTS hermes_sessions_agent_id_idx ON hermes_sessions (agent_id);

ALTER TABLE hermes_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_sessions' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_sessions
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_session_events ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_session_events (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event      JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_session_events_org_id_idx   ON hermes_session_events (org_id);
CREATE INDEX IF NOT EXISTS hermes_session_events_session_idx  ON hermes_session_events (session_id);

ALTER TABLE hermes_session_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_session_events' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_session_events
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_session_threads ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_session_threads (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'idle',
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_session_threads_org_id_idx  ON hermes_session_threads (org_id);
CREATE INDEX IF NOT EXISTS hermes_session_threads_session_idx ON hermes_session_threads (session_id);

ALTER TABLE hermes_session_threads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_session_threads' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_session_threads
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_memory_stores ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_memory_stores (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_memory_stores_org_id_idx ON hermes_memory_stores (org_id);

ALTER TABLE hermes_memory_stores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_memory_stores' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_memory_stores
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_memories ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_memories (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  store_id   TEXT NOT NULL,
  content    TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_memories_org_id_idx  ON hermes_memories (org_id);
CREATE INDEX IF NOT EXISTS hermes_memories_store_id_idx ON hermes_memories (store_id);

ALTER TABLE hermes_memories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_memories' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_memories
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_vaults ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_vaults (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  display_name TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}',
  archived_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_vaults_org_id_idx ON hermes_vaults (org_id);

ALTER TABLE hermes_vaults ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_vaults' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_vaults
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_skills ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_skills (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  display_title TEXT,
  source        TEXT NOT NULL DEFAULT 'custom',
  file_ids      JSONB NOT NULL DEFAULT '[]',
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_skills_org_id_idx ON hermes_skills (org_id);

ALTER TABLE hermes_skills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_skills' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_skills
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_environments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_environments (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}',
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_environments_org_id_idx ON hermes_environments (org_id);

ALTER TABLE hermes_environments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_environments' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_environments
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_user_profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_user_profiles (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  external_id  TEXT NOT NULL,
  name         TEXT,
  relationship TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_user_profiles_org_id_idx     ON hermes_user_profiles (org_id);
CREATE UNIQUE INDEX IF NOT EXISTS hermes_user_profiles_ext_idx ON hermes_user_profiles (org_id, external_id);

ALTER TABLE hermes_user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_user_profiles' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_user_profiles
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;

-- ── hermes_webhooks ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_webhooks (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  url         TEXT NOT NULL,
  events      JSONB NOT NULL DEFAULT '[]',
  metadata    JSONB NOT NULL DEFAULT '{}',
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hermes_webhooks_org_id_idx ON hermes_webhooks (org_id);

ALTER TABLE hermes_webhooks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hermes_webhooks' AND policyname = 'org_isolation'
  ) THEN
    CREATE POLICY org_isolation ON hermes_webhooks
      USING (org_id = current_setting('app.org_id', TRUE));
  END IF;
END
$$;
