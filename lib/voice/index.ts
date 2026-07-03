/**
 * Voice module exports
 */

export type {
  VoiceConfig,
  VoiceProvider,
  WakeWordProvider,
  AudioFormat,
  AudioCodec,
  SpeechToTextRequest,
  SpeechToTextResult,
  TextToSpeechRequest,
  TextToSpeechResult,
  VoiceMessage,
  WakeWordDetectionConfig,
  WakeWordDetectionResult,
  VoiceStreamConfig,
  VoiceStreamMessage,
} from './types';

export { VoiceService } from './voice-service';
