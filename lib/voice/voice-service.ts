/**
 * Voice Service - Speech-to-text, text-to-speech, voice streaming
 * Integrates multiple providers (ElevenLabs, Deepgram, etc.)
 */

import { randomUUID } from 'crypto';
import {
  VoiceConfig,
  SpeechToTextRequest,
  SpeechToTextResult,
  TextToSpeechRequest,
  TextToSpeechResult,
  VoiceMessage,
  WakeWordDetectionConfig,
  WakeWordDetectionResult,
} from './types';

export class VoiceService {
  private config: VoiceConfig;
  private supabasePromise: Promise<any> | null = null;

  constructor(config: VoiceConfig) {
    this.config = config;
  }

  private async getSupabase() {
    if (!this.supabasePromise) {
      const { createClient } = await import('@/lib/supabase/server');
      this.supabasePromise = createClient();
    }
    return this.supabasePromise;
  }

  /**
   * Convert speech to text using configured STT provider
   */
  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResult> {
    try {
      switch (this.config.stt_provider) {
        case 'deepgram':
          return await this.deepgramSTT(request);
        case 'assembly':
          return await this.assemblySTT(request);
        case 'openai':
          return await this.openaiSTT(request);
        case 'google':
          return await this.googleSTT(request);
        default:
          throw new Error(`Unsupported STT provider: ${this.config.stt_provider}`);
      }
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw error;
    }
  }

  /**
   * Convert text to speech using configured TTS provider
   */
  async textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    try {
      switch (this.config.tts_provider) {
        case 'elevenlabs':
          return await this.elevenLabsTTS(request);
        case 'google':
          return await this.googleTTS(request);
        case 'openai':
          return await this.openaiTTS(request);
        case 'deepgram':
          return await this.deepgramTTS(request);
        default:
          throw new Error(`Unsupported TTS provider: ${this.config.tts_provider}`);
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }

  /**
   * Deepgram STT Implementation
   */
  private async deepgramSTT(request: SpeechToTextRequest): Promise<SpeechToTextResult> {
    try {
      const formData = new FormData();
      let audioBlob: Blob;

      if (request.audio instanceof Buffer) {
        audioBlob = new Blob([request.audio]);
      } else if (request.audio instanceof Blob) {
        audioBlob = request.audio;
      } else if (request.audio instanceof ReadableStream) {
        const chunks: Uint8Array[] = [];
        const reader = request.audio.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        audioBlob = new Blob(chunks);
      } else {
        audioBlob = new Blob([request.audio as any]);
      }

      formData.append('audio', audioBlob, 'audio');

      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.config.deepgram_api_key}`,
        },
        body: formData,
      });

      const data = await response.json();

      return {
        text: data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '',
        confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence,
        language: request.language || 'en',
      };
    } catch (error) {
      console.error('Deepgram STT error:', error);
      throw error;
    }
  }

  /**
   * Assembly AI STT Implementation
   */
  private async assemblySTT(request: SpeechToTextRequest): Promise<SpeechToTextResult> {
    try {
      console.log('Assembly AI STT - Processing audio...');
      // Upload audio
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          Authorization: this.config.assembly_api_key || '',
        },
        body: request.audio instanceof Buffer ? request.audio : await (request.audio as Blob).arrayBuffer(),
      });

      const uploadData = await uploadResponse.json();
      const audioUrl = uploadData.upload_url;

      // Submit transcription job
      const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          Authorization: this.config.assembly_api_key || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: request.language || 'en',
        }),
      });

      const transcribeData = await transcribeResponse.json();

      return {
        text: transcribeData.text || '',
        confidence: transcribeData.confidence,
        language: request.language || 'en',
      };
    } catch (error) {
      console.error('Assembly AI STT error:', error);
      throw error;
    }
  }

  /**
   * OpenAI Whisper STT Implementation
   */
  private async openaiSTT(request: SpeechToTextRequest): Promise<SpeechToTextResult> {
    try {
      const formData = new FormData();
      let audioBlob: Blob;

      if (request.audio instanceof Buffer) {
        audioBlob = new Blob([request.audio]);
      } else if (request.audio instanceof Blob) {
        audioBlob = request.audio;
      } else if (request.audio instanceof ReadableStream) {
        const chunks: Uint8Array[] = [];
        const reader = request.audio.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        audioBlob = new Blob(chunks);
      } else {
        audioBlob = new Blob([request.audio as any]);
      }

      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('language', request.language || 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.openai_api_key}`,
        },
        body: formData,
      });

      const data = await response.json();

      return {
        text: data.text || '',
        language: request.language || 'en',
      };
    } catch (error) {
      console.error('OpenAI Whisper STT error:', error);
      throw error;
    }
  }

  /**
   * Google Cloud STT Implementation
   */
  private async googleSTT(request: SpeechToTextRequest): Promise<SpeechToTextResult> {
    try {
      console.log('Google Cloud STT - Processing audio...');
      // Placeholder for Google Cloud Speech-to-Text API
      return {
        text: 'Transcribed text from Google Cloud Speech-to-Text',
        language: request.language || 'en',
      };
    } catch (error) {
      console.error('Google Cloud STT error:', error);
      throw error;
    }
  }

  /**
   * ElevenLabs TTS Implementation
   */
  private async elevenLabsTTS(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    try {
      const voiceId = request.voice_id || this.config.voice_id || '21m00Tcm4TlvDq8ikWAM';

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.config.elevenlabs_api_key || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: request.text,
            model_id: this.config.model || 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      const audioBuffer = await response.arrayBuffer();

      return {
        audio: Buffer.from(audioBuffer),
        format: 'mp3',
        duration_ms: Math.round((request.text.length / 100) * 1000), // Rough estimate
        sample_rate: 24000,
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }

  /**
   * Google Cloud TTS Implementation
   */
  private async googleTTS(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    try {
      console.log('Google Cloud TTS - Generating speech...');
      // Placeholder for Google Cloud Text-to-Speech API
      return {
        audio: Buffer.from('audio data'),
        format: 'mp3',
        duration_ms: Math.round((request.text.length / 100) * 1000),
        sample_rate: 24000,
      };
    } catch (error) {
      console.error('Google Cloud TTS error:', error);
      throw error;
    }
  }

  /**
   * OpenAI TTS Implementation
   */
  private async openaiTTS(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.openai_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: request.text,
          voice: request.voice_id || 'alloy',
          speed: request.speed || 1,
        }),
      });

      const audioBuffer = await response.arrayBuffer();

      return {
        audio: Buffer.from(audioBuffer),
        format: 'mp3',
        duration_ms: Math.round((request.text.length / 100) * 1000),
        sample_rate: 24000,
      };
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      throw error;
    }
  }

  /**
   * Deepgram TTS Implementation
   */
  private async deepgramTTS(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    try {
      console.log('Deepgram TTS - Generating speech...');
      // Placeholder for Deepgram TTS API
      return {
        audio: Buffer.from('audio data'),
        format: 'mp3',
        duration_ms: Math.round((request.text.length / 100) * 1000),
        sample_rate: 24000,
      };
    } catch (error) {
      console.error('Deepgram TTS error:', error);
      throw error;
    }
  }

  /**
   * Detect wake words in audio
   */
  async detectWakeWord(
    audio: Buffer,
    config: WakeWordDetectionConfig
  ): Promise<WakeWordDetectionResult> {
    try {
      if (!config.enabled) {
        return { detected: false };
      }

      // Use Picovoice for wake word detection
      if (this.config.wake_word_provider === 'picovoice') {
        return await this.picovoiceWakeWord(audio, config);
      }

      return { detected: false };
    } catch (error) {
      console.error('Wake word detection error:', error);
      return { detected: false };
    }
  }

  /**
   * Picovoice Wake Word Implementation
   */
  private async picovoiceWakeWord(
    audio: Buffer,
    config: WakeWordDetectionConfig
  ): Promise<WakeWordDetectionResult> {
    try {
      console.log('Picovoice - Detecting wake words...');
      // Placeholder for Picovoice wake word detection
      return {
        detected: false,
      };
    } catch (error) {
      console.error('Picovoice error:', error);
      return { detected: false };
    }
  }

  /**
   * Store voice message in database
   */
  async storeVoiceMessage(message: VoiceMessage): Promise<VoiceMessage> {
    try {
      const supabase = await this.getSupabase();

      const { data, error } = await supabase
        .from('voice_messages')
        .insert([message])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to store voice message:', error);
      throw error;
    }
  }

  /**
   * Get voice messages for session
   */
  async getVoiceMessages(session_id: string, limit: number = 50): Promise<VoiceMessage[]> {
    try {
      const supabase = await this.getSupabase();

      const { data, error } = await supabase
        .from('voice_messages')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get voice messages:', error);
      return [];
    }
  }
}
