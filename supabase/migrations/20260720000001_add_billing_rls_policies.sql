-- Add Row-Level Security (RLS) policies to billing tables
-- Ensures customers can only read their own billing records

-- Enable RLS on billing_customers table
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their organization's billing customers
CREATE POLICY "users_can_read_own_org_customers"
  ON billing_customers
  FOR SELECT
  USING (
    org_id = (
      SELECT org_id
      FROM users
      WHERE auth.uid() = users.id
      LIMIT 1
    )
  );

-- Policy: Only service role can insert/update/delete (webhook handler)
CREATE POLICY "service_role_only_write_customers"
  ON billing_customers
  FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "service_role_only_update_customers"
  ON billing_customers
  FOR UPDATE
  WITH CHECK (FALSE);

-- Enable RLS on billing_subscriptions table
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read subscriptions for their organization
CREATE POLICY "users_can_read_own_org_subscriptions"
  ON billing_subscriptions
  FOR SELECT
  USING (
    org_id = (
      SELECT org_id
      FROM users
      WHERE auth.uid() = users.id
      LIMIT 1
    )
  );

-- Policy: Only service role can insert/update/delete (webhook handler)
CREATE POLICY "service_role_only_write_subscriptions"
  ON billing_subscriptions
  FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "service_role_only_update_subscriptions"
  ON billing_subscriptions
  FOR UPDATE
  WITH CHECK (FALSE);

-- Enable RLS on billing_events table (audit log - service role only)
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access events (no user-facing reads)
CREATE POLICY "service_role_only_events"
  ON billing_events
  FOR ALL
  USING (FALSE);
