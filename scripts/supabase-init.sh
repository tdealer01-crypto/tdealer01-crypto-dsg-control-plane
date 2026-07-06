#!/usr/bin/env bash
# Supabase Initialization Script for DSG Control Plane
# Run: chmod +x scripts/supabase-init.sh && ./scripts/supabase-init.sh

set -euo pipefail

echo "🗄️  Supabase Database Initialization for DSG Control Plane"
echo "=========================================================="

# Check prerequisites
command -v supabase >/dev/null 2>&1 || { echo "❌ supabase CLI not installed. Run: npm i -g supabase"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ psql not installed. Run: pkg install postgresql"; exit 1; }

# Verify login
echo "🔐 Checking Supabase login..."
supabase projects list >/dev/null 2>&1 || { echo "Run: supabase login"; exit 1; }

PROJECT_REF=$(supabase projects list --output json | jq -r '.[] | select(.name == "tdealer01-crypto-dsg-control-plane") | .id' | head -1)

if [[ -z "$PROJECT_REF" ]]; then
  echo "❌ Project not found. Create project at supabase.com first."
  exit 1
fi

echo "📦 Linking Supabase project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" 2>/dev/null || true

echo "📦 Applying migrations..."
supabase db push

echo "🗄️  Creating DSG-specific tables..."

# Run custom SQL for DSG tables
psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" <<'EOF'

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Subscriptions table (ProofGate)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')) DEFAULT 'active',
  current_period_end TIMESTAMPTZ NOT NULL,
  payment_method_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Z3 Proofs table
CREATE TABLE IF NOT EXISTS z3_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  circuit TEXT NOT NULL,
  public_inputs JSONB NOT NULL,
  proof_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_z3_proofs_subscription ON z3_proofs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_z3_proofs_circuit ON z3_proofs(circuit);

-- Evidence Items (WORM - Write Once Read Many)
CREATE TABLE IF NOT EXISTS dsg_evidence_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_hash TEXT NOT NULL UNIQUE,
  evidence_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  source TEXT NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_hash ON dsg_evidence_items(evidence_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON dsg_evidence_items(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_collected ON dsg_evidence_items(collected_at);

-- Gate Decisions (Audit Trail)
CREATE TABLE IF NOT EXISTS gate_decisions (
  (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'BLOCK', 'REVIEW')),
  reason TEXT,
  z3_proof_hash TEXT,
  evidence_hashes TEXT[] DEFAULT '{}',
  conditions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gate_decisions_action ON gate_decis(action_id);
CREATE INDEX IF NOT EXISTS idx_gate_decisions_agent ON gate_decis(agent_type);
CREATE INDEX IF NOT EXISTS idx_gate_decisions_created ON gate_decis(created_at);

-- Agent Registry
CREATE TABLE IF NOT EXISTS agent_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] DEFAULT '{}',
  model TEXT NOT NULL,
  max_concurrency INT DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('active', 'idle', 'busy', 'stopping', 'stopped', 'registering')) DEFAULT 'active',
  current_task_id TEXT,
  tasks_completed INT DEFAULT 0,
  evidence_hashes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_registry_status ON agent_registry(status);
CREATE INDEX IF NOT EXISTS idx_agent_registry_role ON agent_registry(role);

-- Event Bus Streams
CREATE TABLE IF NOT EXISTS event_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_key TEXT NOT NULL UNIQUE,
  events JSONB[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Memory
CREATE TABLE IF NOT EXISTS shared_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('working', 'semantic', 'episodic')),
  content JSONB NOT NULL,
  metadata JSONB,
  importance NUMERIC(3,2) DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  tags TEXT[] DEFAULT '{}',
  embedding VECTOR(1536),
  evidence_hash TEXT NOT NULL,
  access_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_memory_agent ON shared_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_shared_memory_type ON shared_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_shared_memory_tags ON shared_memory USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_shared_memory_embedding ON shared_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Executive Hierarchy
CREATE TABLE IF NOT EXISTS executive_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  executive_role TEXT NOT NULL CHECK (executive_role IN ('ceo', 'coo', 'cto')),
  agent_id UUID REFERENCES agent_registry(id),
  department_agent_ids UUID[] DEFAULT '{}',
  authority_level INT NOT NULL,
  decision_threshold NUMERIC(3,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executive Decisions
CREATE TABLE IF NOT EXISTS executive_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  executive_id UUID REFERENCES executive_hierarchy(id),
  executive_role TEXT NOT NULL CHECK (executive_role IN ('ceo', 'coo', 'cto')),
  decision_type TEXT NOT NULL CHECK (decision_type IN ('strategic', 'operational', 'technical', 'resource_allocation', 'risk_approval')),
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL,
  selected_option TEXT,
  confidence NUMERIC(3,2) DEFAULT 0,
  requires_gate_approval BOOLEAN DEFAULT TRUE,
  gate_decision TEXT CHECK (gate_decision IN ('ALLOW', 'BLOCK', 'REVIEW')),
  z3_proof_hash TEXT,
  evidence_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE z3_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_decis ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Subscriptions: users can only see their own
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (customer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (customer_id = auth.jwt() ->> 'sub');

-- Evidence: only service role can insert, anyone can read verified
CREATE POLICY "Anyone can read verified evidence" ON dsg_evidence_items
  FOR SELECT USING (verified = TRUE);

CREATE POLICY "Service role can insert evidence" ON dsg_evidence_items
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Gate decisions: readable by all, writable by service role
CREATE POLICY "Anyone can read gate decisions" ON gate_decis
  FOR SELECT USING (TRUE);

CREATE POLICY "Service role can insert gate decisions" ON gate_decis
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Agent registry: readable by all
CREATE POLICY "Anyone can read agents" ON agent_registry
  FOR SELECT USING (TRUE);

-- Shared memory: agent can read/write own
CREATE POLICY "Agent can read own memory" ON shared_memory
  FOR SELECT USING (agent_id = auth.jwt() ->> 'sub');

CREATE POLICY "Agent can write own memory" ON shared_memory
  FOR INSERT WITH CHECK (agent_id = auth.jwt() ->> 'sub');

-- Functions
CREATE OR REPLACE FUNCTION updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION updated_at_column();

CREATE TRIGGER update_agent_registry_updated_at BEFORE UPDATE ON agent_registry
  FOR EACH ROW EXECUTE FUNCTION updated_at_column();

CREATE TRIGGER update_shared_memory_updated_at BEFORE UPDATE ON shared_memory
  FOR EACH ROW EXECUTE FUNCTION updated_at_column();

-- Helper: Get active subscription
CREATE OR REPLACE FUNCTION get_active_subscription(p_customer_id TEXT)
RETURNS SETOF subscriptions LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM subscriptions
  WHERE customer_id = p_customer_id
    AND status = 'active'
    AND current_period_end > NOW();
$$;

-- Helper: Verify Z3 proof
CREATE OR REPLACE FUNCTION verify_z3_proof(p_proof_hash TEXT, p_expected_circuit TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM z3_proofs
    WHERE proof_hash = p_proof_hash
      AND circuit = p_expected_circuit
      AND verified = TRUE
  );
$$;

EOF

echo "✅ Supabase initialization complete!"
echo ""
echo "📋 Next Steps:"
echo "  1. Set SUPABASE_DB_PASSWORD env var if not set"
echo "  2. Run: vercel deploy --prod --force"
echo "  3. Test: curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health"