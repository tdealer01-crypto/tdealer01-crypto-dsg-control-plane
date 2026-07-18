-- Create table for Trinity Agent chat history
CREATE TABLE IF NOT EXISTS trinity_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID NOT NULL,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('Mind', 'Hand', 'Eye', 'Nerve', 'Spine', 'All')),
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  tool_calls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_trinity_chat_session ON trinity_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_trinity_chat_agent ON trinity_chat_history(agent_name);
CREATE INDEX IF NOT EXISTS idx_trinity_chat_created ON trinity_chat_history(created_at DESC);

-- Enable RLS
ALTER TABLE trinity_chat_history ENABLE ROW LEVEL SECURITY;

-- Policy: public read/write (for demo; should be restricted in production)
CREATE POLICY "Trinity chat access" ON trinity_chat_history
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE trinity_chat_history IS 'Trinity agent chat history with multi-agent support and tool tracking';
