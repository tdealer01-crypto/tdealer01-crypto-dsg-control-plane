-- Visitor counter table for Hello Thanawat webpage
CREATE TABLE IF NOT EXISTS visitor_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_count CHECK (count >= 0)
);

-- Index for page lookup
CREATE INDEX idx_visitor_counters_page ON visitor_counters(page);

-- Enable RLS
ALTER TABLE visitor_counters ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records
CREATE POLICY visitor_counters_service_role
  ON visitor_counters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous users can read but not write directly
CREATE POLICY visitor_counters_read
  ON visitor_counters
  FOR SELECT
  TO anon
  USING (true);

-- Comment for documentation
COMMENT ON TABLE visitor_counters IS 'Global visitor counter for public pages';
COMMENT ON COLUMN visitor_counters.page IS 'Page identifier (e.g. hello-thanawat)';
COMMENT ON COLUMN visitor_counters.count IS 'Cumulative visitor count for this page';
