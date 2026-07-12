-- Support ticket system tables and policies

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'security', 'feature_request')),
  sla_due_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Support ticket messages (comments)
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Support escalations
CREATE TABLE IF NOT EXISTS support_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  escalated_from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  escalation_team TEXT NOT NULL CHECK (escalation_team IN ('engineering', 'product', 'security', 'leadership', 'billing')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_support_tickets_org_id ON support_tickets(org_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_support_escalations_ticket_id ON support_escalations(ticket_id);
CREATE INDEX idx_support_escalations_team ON support_escalations(escalation_team);

-- Row-level security policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_escalations ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's tickets
CREATE POLICY support_tickets_select_org_members
  ON support_tickets FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Org members can create tickets
CREATE POLICY support_tickets_insert_org_members
  ON support_tickets FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()) AND created_by = auth.uid());

-- Org members can update their org's tickets
CREATE POLICY support_tickets_update_org_members
  ON support_tickets FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Messages RLS
CREATE POLICY support_messages_select
  ON support_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())));

CREATE POLICY support_messages_insert
  ON support_messages FOR INSERT
  WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())) AND author_id = auth.uid());

-- Escalations RLS
CREATE POLICY support_escalations_select
  ON support_escalations FOR SELECT
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())));

CREATE POLICY support_escalations_insert
  ON support_escalations FOR INSERT
  WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid())) AND escalated_from_user_id = auth.uid());
