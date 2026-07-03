-- Phase 4: Gateway - Multi-Channel Message Broker Tables

-- Gateway Sessions Table
CREATE TABLE IF NOT EXISTS gateway_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'slack', 'discord', 'signal', 'google-chat', 'teams', 'irc', 'matrix', 'feishu', 'line', 'mattermost', 'zalo', 'wechat', 'qq', 'twitch', 'webchat', 'ios', 'android', 'macos')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'closed', 'archived')),
  channel_thread_id TEXT,
  workspace_id UUID,
  context JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT NULL,
  
  CONSTRAINT unique_session_per_user_channel UNIQUE (agent_id, channel, user_id)
);

CREATE INDEX idx_gateway_sessions_agent_id ON gateway_sessions(agent_id);
CREATE INDEX idx_gateway_sessions_channel ON gateway_sessions(channel);
CREATE INDEX idx_gateway_sessions_status ON gateway_sessions(status);
CREATE INDEX idx_gateway_sessions_user_id ON gateway_sessions(user_id);

-- Gateway Messages Table
CREATE TABLE IF NOT EXISTS gateway_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES gateway_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'slack', 'discord', 'signal', 'google-chat', 'teams', 'irc', 'matrix', 'feishu', 'line', 'mattermost', 'zalo', 'wechat', 'qq', 'twitch', 'webchat', 'ios', 'android', 'macos')),
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'file', 'voice', 'location', 'reaction')),
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  metadata JSONB DEFAULT NULL,
  attachments JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_gateway_messages_session_id ON gateway_messages(session_id);
CREATE INDEX idx_gateway_messages_agent_id ON gateway_messages(agent_id);
CREATE INDEX idx_gateway_messages_channel ON gateway_messages(channel);
CREATE INDEX idx_gateway_messages_created_at ON gateway_messages(created_at);

-- Gateway Users Table
CREATE TABLE IF NOT EXISTS gateway_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'slack', 'discord', 'signal', 'google-chat', 'teams', 'irc', 'matrix', 'feishu', 'line', 'mattermost', 'zalo', 'wechat', 'qq', 'twitch', 'webchat', 'ios', 'android', 'macos')),
  channel_user_id TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  phone TEXT,
  email TEXT,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_user_per_channel UNIQUE (channel, channel_user_id)
);

CREATE INDEX idx_gateway_users_channel ON gateway_users(channel);
CREATE INDEX idx_gateway_users_email ON gateway_users(email);

-- Gateway Events Table (for logging and processing)
CREATE TABLE IF NOT EXISTS gateway_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('message.received', 'message.sent', 'session.created', 'session.closed', 'user.status', 'channel.status')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'slack', 'discord', 'signal', 'google-chat', 'teams', 'irc', 'matrix', 'feishu', 'line', 'mattermost', 'zalo', 'wechat', 'qq', 'twitch', 'webchat', 'ios', 'android', 'macos')),
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_gateway_events_type ON gateway_events(type);
CREATE INDEX idx_gateway_events_channel ON gateway_events(channel);
CREATE INDEX idx_gateway_events_processed ON gateway_events(processed);
CREATE INDEX idx_gateway_events_created_at ON gateway_events(created_at);

-- Gateway Channels Configuration Table
CREATE TABLE IF NOT EXISTS gateway_channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'slack', 'discord', 'signal', 'google-chat', 'teams', 'irc', 'matrix', 'feishu', 'line', 'mattermost', 'zalo', 'wechat', 'qq', 'twitch', 'webchat', 'ios', 'android', 'macos')),
  enabled BOOLEAN DEFAULT FALSE,
  credentials JSONB NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  settings JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_channel_per_agent UNIQUE (agent_id, channel)
);

CREATE INDEX idx_gateway_channel_configs_agent_id ON gateway_channel_configs(agent_id);
CREATE INDEX idx_gateway_channel_configs_channel ON gateway_channel_configs(channel);
CREATE INDEX idx_gateway_channel_configs_enabled ON gateway_channel_configs(enabled);

-- Enable RLS
ALTER TABLE gateway_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_channel_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic org-level isolation)
CREATE POLICY gateway_sessions_isolation ON gateway_sessions
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE org_id = current_user_org_id())
  );

CREATE POLICY gateway_messages_isolation ON gateway_messages
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE org_id = current_user_org_id())
  );

CREATE POLICY gateway_users_select ON gateway_users
  FOR SELECT USING (true);

CREATE POLICY gateway_events_isolation ON gateway_events
  FOR ALL USING (true);

CREATE POLICY gateway_channel_configs_isolation ON gateway_channel_configs
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE org_id = current_user_org_id())
  );
