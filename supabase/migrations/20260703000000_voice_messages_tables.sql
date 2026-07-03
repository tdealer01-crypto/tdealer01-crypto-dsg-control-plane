-- Phase 5: Voice & Real-time Features - Voice messaging tables

-- voice_messages table for storing voice/audio messages
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'audio', -- 'audio', 'transcript', 'synthesis'
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  text_content TEXT, -- Transcribed or input text
  audio_metadata JSONB, -- Provider, duration, confidence, format, voice_id, etc.
  audio_url TEXT, -- Storage URL for audio file
  duration_seconds FLOAT, -- Duration in seconds
  language_code TEXT DEFAULT 'en', -- Language code
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES gateway_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_voice_messages_session_id ON voice_messages(session_id);
CREATE INDEX idx_voice_messages_created_at ON voice_messages(created_at DESC);
CREATE INDEX idx_voice_messages_direction ON voice_messages(direction);

-- voice_stream_sessions table for tracking real-time voice streaming sessions
CREATE TABLE IF NOT EXISTS voice_stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  stream_status TEXT DEFAULT 'active', -- 'active', 'paused', 'closed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_duration_seconds FLOAT,
  audio_format TEXT, -- 'pcm', 'mp3', 'opus', 'aac', 'wav'
  sample_rate INTEGER DEFAULT 16000, -- Audio sample rate
  channels INTEGER DEFAULT 1, -- Mono/stereo
  stream_metadata JSONB, -- Custom metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES gateway_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_voice_stream_sessions_session_id ON voice_stream_sessions(session_id);
CREATE INDEX idx_voice_stream_sessions_status ON voice_stream_sessions(stream_status);

-- voice_settings table for per-agent voice preferences
CREATE TABLE IF NOT EXISTS voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  stt_provider TEXT DEFAULT 'deepgram', -- 'deepgram', 'assembly', 'openai', 'google'
  tts_provider TEXT DEFAULT 'elevenlabs', -- 'elevenlabs', 'google', 'openai', 'deepgram'
  preferred_voice TEXT, -- Voice ID for TTS
  language_code TEXT DEFAULT 'en',
  sample_rate INTEGER DEFAULT 16000,
  audio_format TEXT DEFAULT 'opus',
  enable_wake_word BOOLEAN DEFAULT FALSE,
  wake_word_provider TEXT, -- 'picovoice', 'google', 'custom'
  wake_words TEXT[], -- Array of wake word phrases
  enable_live_transcription BOOLEAN DEFAULT TRUE,
  transcription_delay_ms INTEGER DEFAULT 100,
  speech_timeout_ms INTEGER DEFAULT 3000, -- Silence timeout to end speech
  settings_metadata JSONB, -- Provider-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

CREATE INDEX idx_voice_settings_agent_id ON voice_settings(agent_id);

-- Enable RLS for all voice tables
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access voice messages for their org's sessions
CREATE POLICY voice_messages_org_access ON voice_messages
  FOR ALL
  USING (
    session_id IN (
      SELECT session_id FROM gateway_sessions
      WHERE org_id = current_user_org_id()
    )
  );

-- RLS Policy: Users can only access stream sessions for their org
CREATE POLICY voice_stream_sessions_org_access ON voice_stream_sessions
  FOR ALL
  USING (
    session_id IN (
      SELECT session_id FROM gateway_sessions
      WHERE org_id = current_user_org_id()
    )
  );

-- RLS Policy: Users can only manage voice settings for agents in their org
CREATE POLICY voice_settings_org_access ON voice_settings
  FOR ALL
  USING (
    agent_id IN (
      SELECT agent_id FROM agents
      WHERE org_id = current_user_org_id()
    )
  );
