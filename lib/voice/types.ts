/**
 * Voice Service Type Definitions
 * Speech-to-text, text-to-speech, voice streaming
 */

export type VoiceProvider = 'elevenlabs' | 'google' | 'openai' | 'deepgram' | 'assembly';
export type WakeWordProvider = 'picovoice' | 'google' | 'custom';
export type AudioFormat = 'pcm' | 'mp3' | 'wav' | 'opus' | 'aac';
export type AudioCodec = 'PCMU' | 'OPUS' | 'G722' | 'SPEEX' | 'FLAC';

export interface VoiceConfig {
  tts_provider: VoiceProvider;
  stt_provider: VoiceProvider;
  wake_word_provider: WakeWordProvider;
  elevenlabs_api_key?: string;
  deepgram_api_key?: string;
  assembly_api_key?: string;
  openai_api_key?: string;
  google_api_key?: string;
  picovoice_access_key?: string;
  elevenlabs_voice_id?: string;
  voice_id?: string;
  model?: string;
  sample_rate?: number;
  channels?: number;
  enable_wake_words?: boolean;
  wake_words?: string[];
}

export interface SpeechToTextRequest {
  audio: Buffer | Blob | ReadableStream;
  format: AudioFormat;
  language?: string;
  model?: string;
}

export interface SpeechToTextResult {
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
  duration_ms?: number;
  speaker_id?: string;
}

export interface TextToSpeechRequest {
  text: string;
  voice_id?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'calm';
}

export interface TextToSpeechResult {
  audio: Buffer;
  format: AudioFormat;
  duration?: number;
  duration_ms?: number;
  sample_rate?: number;
}

export interface VoiceMessage {
  id: string;
  session_id: string;
  agent_id: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  audio_url: string;
  audio_duration_ms: number;
  transcription?: string;
  transcription_confidence?: number;
  language?: string;
  speaker_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface WakeWordDetectionConfig {
  enabled: boolean;
  sensitivity?: number;
  keywords?: string[];
  timeout_ms?: number;
}

export interface WakeWordDetectionResult {
  detected: boolean;
  keyword?: string;
  confidence?: number;
  timestamp?: number;
}

export interface VoiceStreamConfig {
  agent_id: string;
  session_id: string;
  channel: string;
  sample_rate: number;
  channels: number;
  format: AudioCodec;
  enable_vad?: boolean; // Voice Activity Detection
}

export interface VoiceStreamMessage {
  type: 'audio' | 'vad' | 'text' | 'error';
  data: any;
  timestamp: number;
}
