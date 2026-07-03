/**
 * POST /api/voice/synthesize - Convert text to audio
 * Accepts text and returns synthesized audio using configured TTS provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { VoiceService } from '@/lib/voice/voice-service';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { text, session_id, voice_id, speed = 1.0, language = 'en' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await (supabase as any)
      .from('gateway_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Initialize voice service with environment config
    const voiceService = new VoiceService({
      stt_provider: (process.env.VOICE_STT_PROVIDER || 'deepgram') as any,
      tts_provider: (process.env.VOICE_TTS_PROVIDER || 'elevenlabs') as any,
      deepgram_api_key: process.env.DEEPGRAM_API_KEY || '',
      assembly_api_key: process.env.ASSEMBLY_API_KEY || '',
      openai_api_key: process.env.OPENAI_API_KEY || '',
      google_api_key: process.env.GOOGLE_API_KEY || '',
      elevenlabs_api_key: process.env.ELEVENLABS_API_KEY || '',
      elevenlabs_voice_id: voice_id || process.env.ELEVENLABS_VOICE_ID || 'default',
      wake_word_provider: (process.env.WAKE_WORD_PROVIDER || 'picovoice') as any,
      picovoice_access_key: process.env.PICOVOICE_ACCESS_KEY || '',
    });

    // Synthesize text to speech
    const result = await voiceService.textToSpeech({
      text,
      voice_id: voice_id || process.env.ELEVENLABS_VOICE_ID,
      speed,
      language,
    });

    // Store voice message in database
    const { error: storeError } = await (supabase as any)
      .from('voice_messages')
      .insert([
        {
          session_id: session_id,
          message_type: 'audio',
          direction: 'outbound',
          text_content: text,
          audio_metadata: {
            provider: process.env.VOICE_TTS_PROVIDER || 'elevenlabs',
            voice_id: voice_id || process.env.ELEVENLABS_VOICE_ID,
            speed,
            language,
            duration: result.duration || result.duration_ms,
          },
        },
      ]);

    if (storeError) {
      console.warn('Failed to store voice message:', storeError);
      // Don't fail the response if storage fails
    }

    // Return audio as stream with appropriate content type
    const audioBuffer = Buffer.from(result.audio);
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (error) {
    return handleApiError('/api/voice/synthesize POST', error);
  }
}
